import { Server, Socket } from "socket.io";
import { RoomId, SocketId } from "./domain";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "./event";

export type SocketState =
  | {
      status: "idle";
    }
  | {
      status: "in-room";
      roomId: RoomId;
    }
  | {
      status: "in-game";
      roomId: RoomId;
    };

export type RoomState = { id: RoomId; hostId: SocketId; players: SocketId[] };

export type GameState = { round: number };

export type SocketData = {
  id: SocketId;
  state: SocketState;
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
