import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { NodeServer } from "./startup";
import {
  IoServer,
  IoSocket,
  RoomId,
  RoomState,
  SocketId,
  SocketState,
} from "@sounds-fishy/shared";
import { logger } from "./telemetry";

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
    socket.data.state = { status: "idle" };
    next();
  });
  // endregion
  //
  const rooms: Map<RoomId, RoomState> = new Map();

  io.on("connect", (socket) => {
    // region: basic events
    //
    socket.on("error", (error) => {});

    socket.on("disconnect", (reason) => {});
    // endregion

    // region: room events

    socket.on("room:host", () => {
      if (socket.data.state.status === "in-room") {
        logger.info(`Socket ${socket.id} failed to host, already in a room`);
        socket.emit("room:join_failed", "Already in a room");
        return;
      }

      const newRoomId = uuid() as RoomId;
      socket.join(newRoomId);
      socket.emit("room:hosted", newRoomId);

      socket.data.state = {
        status: "in-room",
        roomId: newRoomId,
      };

      rooms.set(newRoomId, {
        id: newRoomId,
        hostId: socket.id as SocketId,
        players: [socket.id as SocketId],
      });
    });

    socket.on("room:join", (roomId: RoomId) => {
      if (["in-room", "in-game"].includes(socket.data.state.status)) {
        logger.info(`Socket ${socket.id} failed to join, already in a room`);
        socket.emit("room:join_failed", "already in a room.");
        return;
      }

      const room = rooms.get(roomId);

      if (!room) {
        logger.info(
          `Socket ${socket.id} failed to join, room ${roomId} doesn't exist`,
        );
        socket.emit("room:join_failed", "Room does not exist.");
        return;
      }

      socket.emit("room:joined", roomId);
      socket.join(roomId);

      rooms.set(roomId, {
        ...room,
        players: [...room.players, socket.id as SocketId],
      });

      socket.data.state = {
        status: "in-room",
        roomId,
      };
    });

    socket.on("room:leave", () => {
      if (socket.data.state.status === "idle") {
        logger.info(
          "Failed to leave room because the socket is not in any room",
        );
        return;
      }

      if (!rooms.has(socket.data.state.roomId)) {
        logger.info(
          `Failed to leave room because the room ${socket.data.state.roomId} doesn't exist`,
        );
        return;
      }
      socket.leave(socket.data.state.roomId);
      socket.data.state = { status: "idle" };
    });

    socket.on("room:chat", (message) => {
      if (socket.data.state.status === "idle") {
        logger.info("Failed to chat, the socket is idling");
        return;
      }

      socket
        .to(socket.data.state.roomId)
        .emit("room:chat", { message, from: socket.id as SocketId });
    });

    // endregion

    // region: game events

    socket.on("game:start", () => {});

    // endregion
  });
};

const calcSocketState = async (
  socket: IoSocket,
  server: IoServer,
): Promise<SocketState> => {
  console.log(socket.id);
  const [roomId] = [...socket.rooms].filter((roomId) => roomId !== socket.id);
  // if (roomId) {
  //   const socketsInRoom = await server.in(roomId).fetchSockets();
  //
  //   return {
  //     status: "in-room",
  //     room: {
  //       id: roomId as RoomId,
  //       hostId: socket.id as SocketId,
  //       players: socketsInRoom.map((s) => s.id as SocketId),
  //     },
  //   };
  // }

  return { status: "idle" };
};
