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
import { err, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { randomInt } from "crypto";
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

      // TODO: clean up rooms state
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

      const assigingPlayerRoles = generateRoles(room.players.length).map(
        (roles) => assignRolesToPlayers(room.players, roles),
      );

      if (assigingPlayerRoles.isErr()) {
        return ack(ackErr("NOT_ENOUGH"));
      }

      const roles = assigingPlayerRoles.value;
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
          hinter: socket.data.id,
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

      if (room.game.hinter !== socket.data.id) {
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

      const newState: ServerState = {
        ...room,
        game: {
          ...room.game,
          hintHistory: [
            ...room.game.hintHistory,
            { hinter: socket.data.id, hint },
          ],
          hinter: undefined,
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

      const eliminateRole = room.game.roles[socketId];

      if (eliminateRole === "blue") {
        logger.info("Game over");
        // TODO: do something to let everyone know that the game is over
        return ack(ackOk());
      }

      const eliminated = room.game.eliminated.add(socketId);
      const newState: ServerState = {
        ...room,
        game: { ...room.game, eliminated },
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
  return questions[randomInt(0, questions.length - 1)];
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
  const { question, round, answer, hinter, hintHistory, eliminated, status } =
    game;

  switch (role) {
    case "master": {
      return { round, question, role, hinter, hintHistory, eliminated, status };
    }
    case "red": {
      return {
        round,
        question,
        answer,
        role,
        hinter,
        hintHistory,
        eliminated,
        status,
      };
    }
    case "blue": {
      return {
        round,
        question,
        answer,
        role,
        hinter,
        hintHistory,
        eliminated,
        status,
      };
    }
  }
};

const calcScore = (): Record<SocketId, number> => {
  return {};
};

const assignRolesToPlayers = (
  players: SocketId[],
  roles: Role[],
): Record<SocketId, Role> => {
  return players.reduce<Record<SocketId, Role>>(
    (prev, curr) => ({ ...prev, [curr]: roles.pop() }),
    {},
  );
};

const generateRoles = (playerNums: number): Result<Role[], string> => {
  if (playerNums < 3) {
    return err("Failed to generate roles, minimum player is 3");
  }

  const requiredRoles: Role[] = ["master", "red", "blue"];

  const additionalRoles: Role[] = Array.from({
    length: playerNums - requiredRoles.length,
  }).map(() => "blue");

  return ok([...requiredRoles, ...additionalRoles]);
};
