import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { NodeServer } from "./startup";
import {
  ackErr,
  ackOk,
  ClientGameState,
  ClientState,
  IoServer,
  Role,
  RoomId,
  ServerGameState,
  ServerState,
  SocketId,
} from "@sounds-fishy/shared";
import { logger } from "./telemetry";
import { okAsync, ResultAsync } from "neverthrow";
import { rooms, sockets } from "./store";

export type { IoServer } from "@sounds-fishy/shared";

export const mountIoServer = (server: NodeServer) => {
  const ioServer: IoServer = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  // TODO: Prod config - restrict CORS origin to specific domains
  attachIoServerEventListeners(ioServer);
  return ioServer;
};

const attachIoServerEventListeners = (io: IoServer) => {
  // region: middleware
  io.use((socket, next) => {
    socket.data.id = socket.id as SocketId;
    next();
  });
  // endregion

  io.on("connect", async (socket) => {
    await sockets.set(socket.data.id, { status: "idle" });

    // region: basic events

    socket.on("error", (error) => {});

    socket.on("disconnect", async () => {
      await sockets.get(socket.data.id).match(
        () => sockets.del(socket.data.id),
        (_) => logger.error("Failed to delete state due to no state stored"),
      );

      // TODO: clean up rooms state if the disconnect guy is the last person
    });
    // endregion

    // region: room events

    socket.on("room:host", async (ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (state.status === "in-room") {
        logger.info(`Socket ${socket.id} failed to host, already in a room`);
        return ack(ackErr("IN_ROOM"));
      }

      const newRoomId = uuid() as RoomId;
      socket.join(newRoomId);

      sockets.set(socket.id as SocketId, {
        status: "in-room",
        roomId: newRoomId,
      });

      rooms.set(newRoomId, {
        id: newRoomId,
        hostId: socket.id as SocketId,
        players: [socket.id as SocketId],
        isPlaying: false,
      });

      const room = (await rooms.get(newRoomId))._unsafeUnwrap();
      const broadcastResult = await broadcastClientState(room, io);

      if (broadcastResult.isErr()) {
        logger.info("Failed to broadcast client state.");
        return ack(ackErr("UNEXPECTED"));
      }

      logger.info(`${room.id} was hosted by ${socket.data.id}`);
      return ack(ackOk(newRoomId));
      // return ack(ackOk());
    });

    socket.on("room:join", async (roomId, ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (["in-room", "in-game"].includes(state.status)) {
        logger.info(`Socket ${socket.id} failed to join, already in a room`);
        return ack(ackErr("IN_ROOM"));
      }

      const roomResult = await rooms.get(roomId);

      if (roomResult.isErr()) {
        logger.info(
          `Socket ${socket.id} failed to join, room ${roomId} doesn't exist`,
        );
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      if (room.isPlaying) {
        logger.info(
          `Socket ${socket.id} failed to join, room ${roomId} is playing`,
        );
        return ack(ackErr("IN_GAME"));
      }

      socket.join(roomId);

      const updatedRoom: ServerState = {
        ...room,
        players: [...room.players, socket.id as SocketId],
      };

      rooms.set(roomId, updatedRoom);

      sockets.set(socket.id as SocketId, {
        status: "in-room",
        roomId,
      });

      const broadcastResult = await broadcastClientState(updatedRoom, io);

      if (broadcastResult.isErr()) {
        logger.info("Failed to broadcast client state.");
        return ack(ackErr("UNEXPECTED"));
      }

      return ack(ackOk());
    });

    socket.on("room:leave", async (ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }
      const state = stateResult.value;

      if (state.status === "idle") {
        logger.info(
          "Failed to leave room because the socket is not in any room",
        );
        return ack(ackErr("NO_ROOM"));
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        logger.info(
          `Failed to leave room because the room ${state.roomId} doesn't exist`,
        );
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      await socket.leave(state.roomId);

      const updatedRoom = {
        ...room,
        players: [...room.players].filter((p) => p !== socket.id),
      };

      await rooms.set(state.roomId, updatedRoom);
      await sockets.set(socket.data.id, { status: "idle" });

      const broadcastResult = await broadcastClientState(updatedRoom, io);

      if (broadcastResult.isErr()) {
        logger.info("Failed to broadcast client state.");
        return ack(ackErr("UNEXPECTED"));
      }

      return ack(ackOk());
    });

    socket.on("room:chat", async (message, ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (state.status === "idle") {
        logger.info("Failed to chat, the socket is idling");
        return ack(ackErr("NO_ROOM"));
      }

      const chat = { message, from: socket.id as SocketId };
      socket.to(state.roomId).emit("room:chat", chat);
      socket.emit("room:chat", chat);
      return ack(ackOk());
    });

    // endregion

    // region: game events
    socket.on("game:start", async (ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (state.status !== "in-room") {
        return ack(ackErr("NO_ROOM"));
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      if (room.isPlaying) {
        return ack(ackErr("IN_GAME"));
      }

      if (room.hostId !== socket.data.id) {
        return ack(ackErr("NOT_HOST"));
      }

      if (room.players.length < 3) {
        return ack(ackErr("NOT_ENOUGH"));
      }

      const roles = assignRolesToPlayers(room.players, new Set());

      const master = Object.entries(roles).find(
        ([_, role]) => role === "master",
      )?.[0] as SocketId;

      if (!master) {
        return ack(ackErr("UNEXPECTED"));
      }
      const [question, answer] = randomProblem();

      const newRoom: ServerState = {
        ...room,
        isPlaying: true,
        game: {
          round: 1,
          question,
          answer,
          questionHistory: new Set([question]),
          roles,
          hintHistory: [],
          eliminated: new Set(),
          status: "select-hinter",
          masterHistory: new Set(),
          currentMaster: master,
        },
      };

      await broadcastClientState(newRoom, io).match(
        () => logger.info("Broadcasted game states."),
        (err) => {
          logger.info(`Failed to brodcast game state, ${err}`);
        },
      );

      await rooms.set(room.id, newRoom);
      await sockets.set(socket.data.id, {
        status: "in-game",
        roomId: state.roomId,
      });

      return ack(ackOk());
    });

    socket.on("game:select-hinter", async (socketId, ack) => {
      const stateResult = await sockets.get(socketId);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (state.status === "idle") {
        return ack(ackErr("UNEXPECTED"));
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      if (!room.isPlaying) {
        logger.info("Room is not playing");
        return ack(ackErr("UNEXPECTED"));
      }

      const role = room.game.roles[socket.data.id];

      if (role !== "master") {
        logger.info("Non-master socket tried to select hinter");
        return ack(ackErr("NOT_MASTER"));
      }

      if (room.game.hintHistory.some((h) => h.hinter === socket.data.id)) {
        logger.info("This socket is already hintHistory");
        return ack(ackErr("ALREADY"));
      }

      const newRoom: ServerState = {
        ...room,
        game: {
          ...room.game,
          // hintHistory: room.game.hintHistory.add(socket.data.id),
          currentHinter: socket.data.id,
        },
      };

      await rooms.set(room.id, newRoom);
      await broadcastClientState(newRoom, io);

      return ack(ackOk());
    });

    socket.on("game:hint", async (hint, ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (state.status === "idle") {
        return ack(ackErr("UNEXPECTED"));
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      if (!room.isPlaying) {
        return ack(ackErr("UNEXPECTED"));
      }

      const role = room.game.roles[socket.data.id];

      if (room.game.currentHinter !== socket.data.id) {
        return ack(ackErr("NOT_HINTER"));
      }

      const isHintAnAnswer =
        room.game.answer.toLowerCase() === hint.trim().toLowerCase();

      switch (role) {
        case "master":
          return ack(ackErr("UNEXPECTED"));
        case "red":
          if (isHintAnAnswer) return ack(ackErr("ANSWER"));
          break;

        case "blue":
          if (!isHintAnAnswer) return ack(ackErr("ANSWER"));
          break;
      }

      const hintHistory = [
        ...room.game.hintHistory,
        { hinter: socket.data.id, hint },
      ];

      const hintedSocketIds = hintHistory.map((h) => h.hinter);

      const isEveryoneHint = room.players
        .filter((socketId) => room.game.currentMaster !== socketId)
        .every(hintedSocketIds.includes);

      const newState: ServerState = {
        ...room,
        game: {
          ...room.game,
          hintHistory,
          status: isEveryoneHint ? "eliminate" : "select-hinter",
          currentHinter: undefined,
        },
      };

      await rooms.set(room.id, newState);
      await broadcastClientState(newState, io);

      return ack(ackOk());
    });

    socket.on("game:eliminate", async (socketId, ack) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const state = stateResult.value;

      if (state.status === "idle") {
        return ack(ackErr("UNEXPECTED"));
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      if (!room.isPlaying) {
        return ack(ackErr("UNEXPECTED"));
      }

      const role = room.game.roles[socket.data.id];

      if (role !== "master") {
        return ack(ackErr("NOT_MASTER"));
      }

      const eliminatedRole = room.game.roles[socketId];

      // this can end multiple ways
      // 1. next round => find new masters, whether win or lose
      // 2. the game is done => if everyone is already a master
      // so the flow should be
      // 1. decide win or lose, save the score
      // 2. decide if next round or the game is done

      if (eliminatedRole === "blue") {
        logger.info("Game over");

        // TODO: do something to let everyone know that the game is over, continue next round

        // TODO: or, if every one is already being a master, the game is done
        const newState = room;
        await rooms.set(room.id, newState);
        await broadcastClientState(newState, io);

        return ack(ackOk());
      }

      const eliminatedSocketIds = room.game.eliminated.add(socketId);
      const redFishSocketIds = Object.entries(room.game.roles)
        .filter(([_, role]) => role === "red")
        .map(([id, _]) => id as SocketId);

      const isAllRedFishEliminated = redFishSocketIds.every(
        eliminatedSocketIds.has,
      );

      if (!isAllRedFishEliminated) {
        const newState: ServerState = {
          ...room,
          game: {
            ...room.game,
            eliminated: eliminatedSocketIds,
          },
        };

        await rooms.set(room.id, newState);
        await broadcastClientState(newState, io);

        return ack(ackOk());
      }

      const [newQuestion, newAnswer] = randomProblem();

      const newRoles = assignRolesToPlayers(
        room.players,
        room.game.masterHistory,
      );

      const newMaster = room.players.find((id) => newRoles[id] === "master");

      if (!newMaster) {
        logger.info("Failed to find new master.");
        return ack(ackErr("UNEXPECTED"));
      }

      const newState: ServerState = {
        ...room,
        game: {
          round: room.game.round + 1,
          questionHistory: room.game.questionHistory,
          question: newQuestion,
          answer: newAnswer,
          status: "select-hinter",
          eliminated: eliminatedSocketIds,
          roles: newRoles,
          currentMaster: newMaster,
          masterHistory: room.game.masterHistory.add(room.game.currentMaster),
          hintHistory: [],
          currentHinter: undefined,
        },
      };

      await rooms.set(room.id, newState);
      await broadcastClientState(newState, io);

      return ack(ackOk());
    });

    // endregion
  });
};

const questions: Array<[string, string]> = [
  ["What is the only fruit that has its seeds on the outside", "Strawberry"],
  ["How long can a snail sleep for?", "Up to 3 years"],
  ["In what country did sushi originate?", "China"],
];

const randomProblem = (exclude?: Set<string>): [string, string] => {
  return questions[Math.floor(Math.random() * questions.length)];
};

const broadcastClientState = (
  room: ServerState,
  io: IoServer,
): ResultAsync<void, string> => {
  return ResultAsync.fromPromise(
    io.in(room.id).fetchSockets(),
    () => "Failed to fetch sockets while broadcasting.",
  ).andThen((sockets) => {
    sockets.forEach((s) => {
      const state = makeClientState(s.id as SocketId, room);
      s.emit("room:sync", state);
    });

    return okAsync();
  });
};

const makeClientState = (
  socketId: SocketId,
  room: ServerState,
): ClientState => {
  const state: ClientState = {
    id: room.id,
    isPlaying: false,
    hostId: room.hostId,
    players: room.players,
  };

  if (!room.isPlaying) {
    return state;
  }

  const role = room.game.roles[socketId];
  const game = makeGameClientState(role, room.game);

  return {
    ...state,
    isPlaying: true,
    game,
  };
};

const makeGameClientState = (
  role: Role,
  game: ServerGameState,
): ClientGameState => {
  const {
    question,
    round,
    answer,
    currentHinter,
    hintHistory,
    eliminated,
    status,
    currentMaster,
    masterHistory,
  } = game;

  switch (role) {
    case "master": {
      return {
        round,
        question,
        role,
        currentHinter,
        hintHistory,
        eliminated,
        status,
        currentMaster,
        masterHistory,
      };
    }
    case "red": {
      return {
        round,
        question,
        answer,
        role,
        currentHinter,
        hintHistory,
        eliminated,
        status,
        currentMaster,
        masterHistory,
      };
    }
    case "blue": {
      return {
        round,
        question,
        answer,
        role,
        currentHinter,
        hintHistory,
        eliminated,
        status,
        currentMaster,
        masterHistory,
      };
    }
  }
};

const calcScore = (): Record<SocketId, number> => {
  return {};
};

const assignRolesToPlayers = (
  players: SocketId[],
  nonMasters?: Set<SocketId>,
): Record<SocketId, Role> => {
  const pool: Role[] = ["master", "blue"];

  for (let i = 0; i < players.length - 2; i++) {
    pool.push("red");
  }

  const result: Record<SocketId, Role> = {};
  const assignedIndices = new Set<number>();

  players.forEach((p) => {
    const availableIndices: number[] = [];
    pool.forEach((_, i) => {
      if (!assignedIndices.has(i)) {
        availableIndices.push(i);
      }
    });

    if (availableIndices.length === 0) {
      throw new Error("No available roles in pool");
    }

    const randomIdx = Math.floor(Math.random() * availableIndices.length);
    const chosenIndex = availableIndices[randomIdx];
    result[p] = pool[chosenIndex];
    assignedIndices.add(chosenIndex);
  });

  return result;
};
