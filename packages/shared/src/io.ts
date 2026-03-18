import { Server, Socket } from "socket.io";
import { RoomId, SocketId } from "./domain";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "./event";

export type SocketData = {
  id: SocketId;
  roomId?: RoomId;
};

export type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type IoSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
