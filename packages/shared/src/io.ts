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

export type RoomState = {
  id: RoomId;
  hostId: SocketId;
  players: SocketId[];
} & ({ isPlaying: false } | { isPlaying: true; game: GameState });

export type Role = ClientGameState["role"];

// game state for backend
export type GameState = {
  round: number;
  question: string;
  answer: string;
  questionHistory: Set<String>;
  roles: Record<SocketId, Role>;
};

// game state for frontend (per role)
export type ClientGameState = (
  | { role: "master" }
  | { role: "red"; answer: string }
  | { role: "blue"; answer: string }
) &
  BaseClientGameState;

type BaseClientGameState = {
  round: number;
  question: string;
};

export type SocketData = {
  id: SocketId;
  // state: SocketState;
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
