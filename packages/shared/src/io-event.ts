import { DefaultEventsMap } from "socket.io";
import { RoomId, SocketId } from "./domain";

export type ClientToServerEvents = {
  "room:host": () => void;
  "room:join": (roomId: RoomId) => void;
  "room:leave": () => void;
  "game:start": () => void;
};

export type ServerToClientEvents = DefaultEventsMap & {
  "room:hosted": (roomId: RoomId) => void;
  "room:joined": (roomId: RoomId) => void;
  "room:join_failed": (reason: string) => void;
  "game:state": () => void;
  "game:error": (reason: string) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  id: SocketId;
  roomId?: RoomId;
};

export type ClientToServer = ClientToServerEvents;
export type ServerToClient = ServerToClientEvents;
export type InterServer = InterServerEvents;
