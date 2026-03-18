import { RoomId } from "./domain";

export type ClientToServerEvents = {
  "room:host": () => void;
  "room:join": (roomId: RoomId) => void;
  "room:leave": () => void;
  "room:chat": (message: string) => void;
  "game:start": () => void;
};

export type ServerToClientEvents = {
  "room:hosted": (roomId: RoomId) => void;
  "room:joined": (roomId: RoomId) => void;
  "room:join_failed": (reason: string) => void;
  "room:chat": (message: string) => void;
  "game:state": () => void;
  "game:error": (reason: string) => void;
};

export type InterServerEvents = Record<string, never>;
