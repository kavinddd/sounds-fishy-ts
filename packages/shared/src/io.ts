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

// Room state
type BaseRoomState = {
  id: RoomId;
  hostId: SocketId;
  players: SocketId[];
};
export type ServerState = BaseRoomState &
  ({ isPlaying: false } | { isPlaying: true; game: ServerGameState });
export type ClientState = BaseRoomState &
  ({ isPlaying: false } | { isPlaying: true; game: ClientGameState });

// GameState
type BaseGameState = {
  round: number;
  status: "select-hinter" | "eliminate" | "hint";
  question: string;
  hints: HintHistory[];
  currentHinter?: SocketId;
  eliminated: Set<SocketId>;
  currentMaster: SocketId;
  currentScore: Record<SocketId, number>;
};

export type ServerGameState = BaseGameState & {
  answer: string;
  questionHistory: Set<string>;
  roles: Record<SocketId, Role>;
  roundHistory: Round[];
};

export type Round = {
  round: number;
  question: string;
  master: SocketId;
  blueFish: SocketId;
  roles: Record<SocketId, Role>;
  eliminated: Set<SocketId>;
};

export type ClientGameState = Omit<BaseGameState, "eliminated"> & {
  eliminated: SocketId[];
} & { roles: Record<SocketId, Role> } & ( // Client receives Array, not Set // Client needs roles of all players
    | { role: "master" }
    | { role: "red"; answer: string }
    | { role: "blue"; answer: string }
  );

export type Role = ClientGameState["role"];

export interface HintHistory {
  hint: string;
  hinter: SocketId;
}

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
