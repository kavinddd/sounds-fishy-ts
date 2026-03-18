import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { NodeServer } from "./startup";
import { IoServer, RoomId } from "@sounds-fishy/shared";
import { logger } from "./telemetry";

export type { IoServer } from "@sounds-fishy/shared";

const attachIoServerEventListeners = (io: IoServer) => {
  io.on("connect", (socket) => {
    socket.on("error", (error) => {
      console.log(error);
    });

    socket.on("disconnect", (reason) => {
      console.log(reason);
    });

    socket.on("room:host", () => {
      // it has at leatst 1 room for its own socket connection
      if (socket.rooms.size > 1) {
        logger.info(`Socket ${socket.id} failed to host, already in a room`);
        socket.emit("room:join_failed", "Already in a room");
        return;
      }

      const newRoomId = uuid() as RoomId;
      socket.join(newRoomId);

      // socket.to(newRoomId);
      socket.emit("room:hosted", newRoomId);
    });

    socket.on("room:join", (roomId: RoomId) => {
      if (socket.rooms.size > 1) {
        logger.info(`Socket ${socket.id} failed to host, already in a room`);
        socket.emit("room:join_failed", "Already in a room");
        return;
      }

      socket.join(roomId);
      socket.emit("room:joined", roomId);
    });
    socket.on("room:leave", () => {
      console.log("left");
    });
    socket.on("game:start", () => {});
  });
};

export const mountIoServer = (server: NodeServer) => {
  const ioServer: IoServer = new Server(server);
  attachIoServerEventListeners(ioServer);
  return ioServer;
};
