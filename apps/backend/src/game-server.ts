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
  Round,
  ServerGameState,
  ServerState,
  SocketId,
} from "@sounds-fishy/shared";
import { logger } from "./telemetry";
import { okAsync, ResultAsync } from "neverthrow";
import { rooms, sockets } from "./store";
import { randomInt } from "crypto";

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

      const blueFish = Object.entries(roles).find(
        ([_, role]) => role === "blue",
      )?.[0] as SocketId;

      if (!master || !blueFish) {
        return ack(ackErr("UNEXPECTED"));
      }
      const [question, answer] = randomProblem();

      const round = 1;
      const questionHistory = new Set([question]);
      const eliminated = new Set<SocketId>();

      const newRoom: ServerState = {
        ...room,
        isPlaying: true,
        game: {
          round,
          question,
          answer,
          questionHistory,
          eliminated,
          roles,
          hints: [],
          status: "select-hinter",
          currentMaster: master,
          currentHinter: undefined,
          roundHistory: [
            { round: 1, eliminated, roles, blueFish, master, question },
          ],
          currentScore: room.players.reduce<Record<SocketId, number>>(
            (prev, curr) => {
              prev[curr] = 0;
              return prev;
            },
            {},
          ),
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

      if (room.game.hints.some((h) => h.hinter === socketId)) {
        return ack(ackErr("ALREADY"));
      }

      const newRoom: ServerState = {
        ...room,
        game: {
          ...room.game,
          currentHinter: socketId,
          status: "hint",
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
        logger.info("Failed to hint, the room was idling.");
        return ack(ackErr("UNEXPECTED"));
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        logger.info("Failed to hint, cannot fetch the room state.");
        return ack(ackErr("UNEXPECTED"));
      }

      const room = roomResult.value;

      if (!room.isPlaying) {
        logger.info("Failed to hint, room was not playing.");
        return ack(ackErr("UNEXPECTED"));
      }

      const role = room.game.roles[socket.data.id];

      if (room.game.currentHinter !== socket.data.id) {
        logger.info("Failed to hint, you are not current hinter.");
        return ack(ackErr("NOT_HINTER"));
      }

      const isHintAnAnswer =
        room.game.answer.toLowerCase() === hint.trim().toLowerCase();

      switch (role) {
        case "master":
          logger.info("Failed to hint, you are master.");
          return ack(ackErr("UNEXPECTED"));
        case "red":
          if (isHintAnAnswer) return ack(ackErr("ANSWER"));
          break;

        case "blue":
          if (!isHintAnAnswer) return ack(ackErr("ANSWER"));
          break;
      }

      const hintHistory = [
        ...room.game.hints,
        { hinter: socket.data.id, hint },
      ];

      const hintedSocketIds = hintHistory.map((h) => h.hinter);

      const isEveryoneHint = room.players
        .filter(
          (socketId) =>
            room.game.currentMaster !== socketId &&
            !room.game.eliminated.has(socketId),
        )
        .every((socketId) => hintedSocketIds.includes(socketId));

      const newState: ServerState = {
        ...room,
        game: {
          ...room.game,
          hints: hintHistory,
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
      const eliminatedSocketIds = room.game.eliminated.add(socketId);

      const allRedFishSocketIds = Object.entries(room.game.roles)
        .filter(([_, role]) => role === "red")
        .map(([id, _]) => id as SocketId);

      const isAllRedFishEliminated = allRedFishSocketIds.every((id) =>
        eliminatedSocketIds.has(id),
      );

      const newState: ServerState = {
        ...room,
        game: {
          ...room.game,
          eliminated: eliminatedSocketIds,
          currentScore: calcScore(room.players, room.game.roundHistory),
          hints: [],
          status: "select-hinter",
        },
      };

      await rooms.set(room.id, newState);

      // Add current round to history for game-ending check
      const currentRoundEntry = {
        round: room.game.round,
        eliminated: room.game.eliminated,
        roles: room.game.roles,
        blueFish: Object.entries(room.game.roles).find(
          ([_, r]) => r === "blue",
        )?.[0] as SocketId,
        master: room.game.currentMaster,
        question: room.game.question,
        hints: room.game.hints,
      };
      newState.game.roundHistory.push(currentRoundEntry);

      const isRoundEnding = eliminatedRole === "blue" || isAllRedFishEliminated;
      const masters = new Set<SocketId>(
        newState.game.roundHistory.map((round) => round.master),
      );
      const activePlayers = newState.players.filter(
        (p) => !newState.game.eliminated.has(p),
      );
      const isGameEnding =
        isRoundEnding &&
        activePlayers.length > 0 &&
        activePlayers.every((p) => masters.has(p));

      if (isGameEnding) {
        const endGameState: ServerState = {
          ...newState,
          isPlaying: false,
        };
        await rooms.set(room.id, endGameState);
        await broadcastClientState(endGameState, io);
        return ack(ackOk());
      }

      if (isRoundEnding) {
        logger.info(
          `Round transition STARTING. Current hints: ${JSON.stringify(newState.game.hints)}`,
        );

        // go next round - reassign roles with previous masters excluded
        // NOTE: current round already added to roundHistory for game-ending check
        logger.info(
          `Going to next round. current round: ${newState.game.round}, eliminated: ${JSON.stringify([...newState.game.eliminated])}`,
        );
        const masters = new Set<SocketId>(
          newState.game.roundHistory.map((round) => round.master),
        );
        logger.info(
          `masters: ${JSON.stringify([...masters])}, activePlayers: ${JSON.stringify(newState.players.filter((p) => !newState.game.eliminated.has(p)))}`,
        );
        const roles = assignRolesToPlayers(newState.players, masters);
        const master = Object.entries(roles).find(
          ([_, role]) => role === "master",
        )?.[0] as SocketId;
        const [question, answer] = randomProblem(
          newState.game.questionHistory as Set<string>,
        );

        const nextRoundState: ServerState = {
          ...newState,
          game: {
            ...newState.game,
            roles,
            question,
            answer,
            currentMaster: master,
            round: newState.game.round + 1,
            eliminated: new Set(),
            status: "select-hinter",
            hints: [],
            eliminated: new Set(),
          },
        };
        logger.info(
          `Round transition: clearing hints. nextRoundState hints length: ${nextRoundState.game.hints.length}`,
        );
        logger.info(
          `nextRoundState round: ${nextRoundState.game.round}, roles: ${JSON.stringify(roles)}`,
        );
        await rooms.set(room.id, nextRoundState);
        const verify = await rooms.get(room.id);
        if (verify.isOk() && verify.value.isPlaying) {
          logger.info(`Verified stored round: ${verify.value.game.round}`);
        }
        await broadcastClientState(nextRoundState, io);
        return ack(ackOk());
      }

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
  const remainingQuestions = questions.filter(
    ([q, _]) => exclude?.has(q) || true,
  );
  return remainingQuestions[randomInt(0, remainingQuestions.length - 1)];
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
  // players: SocketId[],
): ClientGameState => {
  const { question, answer, roundHistory: _, eliminated, roles, ...rest } = game;

  switch (role) {
    case "master": {
      return {
        question,
        role,
        roles,
        eliminated: [...eliminated],
        ...rest,
      };
    }
    case "red": {
      return {
        question,
        answer,
        role,
        roles,
        eliminated: [...eliminated],
        ...rest,
      };
    }
    case "blue": {
      return {
        question,
        answer,
        role,
        roles,
        eliminated: [...eliminated],
        ...rest,
      };
    }
  }
};

const calcScore = (
  players: SocketId[],
  rounds: Round[],
): Record<SocketId, number> => {
  const result: Record<SocketId, number> = {};
  players.forEach((pId) => (result[pId] = 0));

  rounds.forEach((round) => {
    const isMasterWin = !round.eliminated.has(round.blueFish);
    if (isMasterWin) {
      result[round.master] =
        (result[round.master] ?? 0) + round.eliminated.size;
      return;
    }

    const isBlueFishWin = round.eliminated.has(round.blueFish);
    if (isBlueFishWin) {
      result[round.blueFish] =
        result[round.blueFish] ?? 0 + Math.max(2, round.eliminated.size - 1);
      return;
    }

    const survivedRedFishIds = players.filter((p) => {
      return !round.eliminated.has(p) && round.roles[p] === "red";
    });

    survivedRedFishIds.forEach((id) => {
      result[id] = (result[id] ?? 0) + 2;
    });
  });

  return result;
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
