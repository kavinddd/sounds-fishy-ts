import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { NodeServer } from "./startup";
import {
  ClientGameState,
  IoServer,
  Role,
  RoomId,
  RoomState,
  SocketId,
} from "@sounds-fishy/shared";
import { logger } from "./telemetry";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
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
    });
    // endregion

    // region: room events

    socket.on("room:host", async () => {
      const stateResult = await sockets.get(socket.data.id);
      if (stateResult.isErr()) {
        socket.emit("game:error", stateResult.error);
        return;
      }

      const state = stateResult.value;

      if (state.status === "in-room") {
        logger.info(`Socket ${socket.id} failed to host, already in a room`);
        socket.emit("room:join_failed", "Already in a room");
        return;
      }

      const newRoomId = uuid() as RoomId;
      socket.join(newRoomId);
      socket.emit("room:hosted", newRoomId);

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
    });

    socket.on("room:join", async (roomId: RoomId) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        socket.emit("game:error", stateResult.error);
        return;
      }
      const state = stateResult.value;

      if (state.status === "in-room") {
        logger.info(`Socket ${socket.id} failed to host, already in a room`);
        socket.emit("room:join_failed", "Already in a room");
        return;
      }
      if (["in-room", "in-game"].includes(state.status)) {
        logger.info(`Socket ${socket.id} failed to join, already in a room`);
        socket.emit("room:join_failed", "already in a room.");
        return;
      }

      const roomResult = await rooms.get(roomId);

      if (roomResult.isErr()) {
        logger.info(
          `Socket ${socket.id} failed to join, room ${roomId} doesn't exist`,
        );
        socket.emit("room:join_failed", "The room does not exist.");
        return;
      }

      const room = roomResult.value;

      if (room.isPlaying) {
        logger.info(
          `Socket ${socket.id} failed to join, room ${roomId} is playing`,
        );
        socket.emit("room:join_failed", "The room is now playing.");
        return;
      }

      socket.emit("room:joined", roomId);
      socket.join(roomId);

      rooms.set(roomId, {
        ...room,
        players: [...room.players, socket.id as SocketId],
      });

      sockets.set(socket.id as SocketId, {
        status: "in-room",
        roomId,
      });
    });

    socket.on("room:leave", async () => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        socket.emit("game:error", stateResult.error);
        return;
      }
      const state = stateResult.value;

      if (state.status === "idle") {
        logger.info(
          "Failed to leave room because the socket is not in any room",
        );
        return;
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        logger.info(
          `Failed to leave room because the room ${state.roomId} doesn't exist`,
        );
        return;
      }

      const room = roomResult.value;

      socket.leave(state.roomId);
      rooms.set(state.roomId, {
        ...room,
        players: [...room.players].filter((p) => p !== socket.id),
      });
      sockets.set(socket.data.id, { status: "idle" });
    });

    socket.on("room:chat", async (message) => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        socket.emit("game:error", stateResult.error);
        return;
      }
      const state = stateResult.value;

      if (state.status === "idle") {
        logger.info("Failed to chat, the socket is idling");
        return;
      }

      const chat = { message, from: socket.id as SocketId };
      socket.to(state.roomId).emit("room:chat", chat);
      socket.emit("room:chat", chat);
    });

    // endregion

    // region: game events

    socket.on("game:start", async () => {
      const stateResult = await sockets.get(socket.data.id);

      if (stateResult.isErr()) {
        socket.emit("game:error", stateResult.error);
        return;
      }

      const state = stateResult.value;

      if (state.status !== "in-room") {
        socket.emit(
          "game:error",
          "Failed to start game, the user is not in the room.",
        );
        logger.info("Failed to start game, the user is not in the room.");
        return;
      }

      const roomResult = await rooms.get(state.roomId);

      if (roomResult.isErr()) {
        socket.emit(
          "game:error",
          "Failed to start game, unable to fetch room state.",
        );
        logger.info(
          `Failed to leave room because the room ${state.roomId} doesn't exist`,
        );
        return;
      }

      const room = roomResult.value;

      const assigingPlayerRoles = generateRoles(room.players.length).map(
        (roles) => assignRolesToPlayers(room.players, roles),
      );

      if (assigingPlayerRoles.isErr()) {
        logger.info(`Failed to assign roles, ${assigingPlayerRoles.error}`);
        socket.emit(
          "game:error",
          `Failed to assign roles, ${assigingPlayerRoles.error}`,
        );
        return;
      }

      const roles = assigingPlayerRoles.value;
      const [question, answer] = randomQuestion();

      if (room.isPlaying) {
        socket.emit(
          "game:error",
          `Failed to start the game, the game has started.`,
        );
      }

      const newRoom: RoomState = {
        ...room,
        isPlaying: true,
        game: {
          round: 1,
          question,
          answer,
          questionHistory: new Set([question]),
          roles,
        },
      };

      await broadcastGameState(newRoom, io).match(
        () => logger.info("Broadcasted game states"),
        (err) => {
          logger.info(`Failed to brodcast game state, ${err}`);
        },
      );

      rooms.set(room.id, newRoom);
      sockets.set(socket.data.id, {
        status: "in-game",
        roomId: state.roomId,
      });
    });

    // endregion
  });
};

const questions: Array<[string, string]> = [
  ["What is the only fruit that has its seeds on the outside", "Strawberry"],
  ["How long can a snail sleep for?", "Up to 3 years"],
  ["In what country did sushi originate?", "China"],
];

const randomQuestion = (exclude?: Set<String>): [string, string] => {
  return questions[randomInt(0, questions.length - 1)];
};

const broadcastGameState = (
  room: RoomState,
  io: IoServer,
): ResultAsync<void, string> => {
  if (!room.isPlaying) {
    return errAsync(
      "Failed to broadcast game state dues to the game is not started",
    );
  }

  return ResultAsync.fromPromise(
    io.in(room.id).fetchSockets(),
    () => "Failed to fetch sockets while broadcasting.",
  ).andThen((sockets) => {
    sockets.forEach((s) => {
      const state = makeClientGameState(s.id as SocketId, room);
      s.emit("game:state", state);
    });

    return okAsync();
  });
};

const makeClientGameState = (
  socketId: SocketId,
  room: RoomState,
): ClientGameState => {
  if (!room.isPlaying) throw Error("should not happen");

  const role = room.game.roles[socketId];
  const { question, round, answer } = room.game;

  switch (role) {
    case "master": {
      return { round, question, role };
    }
    case "red": {
      return { round, question, answer, role };
    }
    case "blue": {
      return { round, question, answer, role };
    }
  }
};

// const publishGameStates = <R extends Role>(
//   room: RoomState,
//   role: R,
// ): Result<ClientGameState<R>, string> => {
//   if (!room.isPlaying) {
//     return err("The game was not even started. Please calm down.");
//   }
//
//   const game = room.game;
//
//   // return createClientGameState({ role:  })
//
//   return ok({
//     round: game.round,
//     question: game.question,
//     role,
//   });
// };
//
// function createClientGameState<R extends Role>(state: ClientGameState<R>) {
//   return state;
// }
//

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

  const additionalRoles: Role[] = Array.of(
    playerNums - requiredRoles.length,
  ).map(() => "blue");

  return ok([...requiredRoles, ...additionalRoles]);
};
