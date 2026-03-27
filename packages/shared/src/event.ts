import { RoomId, SocketId } from "./domain";
import { ClientState } from "./io";

export type ClientToServerEvents = {
  "room:host": Ack<RoomId, HostError["code"]>;
  "room:join": (
    roomId: RoomId,
    ack: AckCallback<void, JoinError["code"]>,
  ) => void;
  "room:leave": Ack<void, LeaveError["code"]>;
  "room:chat": (
    chat: string,
    ack: AckCallback<void, LeaveError["code"]>,
  ) => void;
  "game:start": Ack<void, StartError["code"]>;
};

export type Ack<T, E extends string> = (ack: AckCallback<T, E>) => void;
export type AckCallback<T, E extends string> = (
  result: AckResult<T, E>,
) => void;
export type AckResult<T, E extends string> = AckOk<T> | AckError<E>;
export type AckOk<T> = T extends void
  ? { success: true }
  : { success: true; data: T };

export function ackOk(): AckOk<void>;
export function ackOk<T>(data: T): AckOk<T>;
export function ackOk<T>(data?: T): any {
  if (data === undefined) return { success: true as const };
  return { success: true as const, data };
}
export const ackErr = <E extends string>(code: E): AckError<E> => ({
  success: false as const,
  code,
});

export type AckError<Code extends string> = {
  success: false;
  code: Code;
};

export type UnexpectedError = AckError<"UNEXPECTED">;

export type HostError = UnexpectedError | AckError<"IN_ROOM">;

export type JoinError =
  | UnexpectedError
  | AckError<"IN_ROOM">
  | AckError<"FULL">
  | AckError<"IN_GAME">;

export type LeaveError = UnexpectedError | AckError<"NO_ROOM">;

export type StartError =
  | UnexpectedError
  | AckError<"NO_ROOM">
  | AckError<"NOT_HOST">
  | AckError<"NOT_ENOUGH">
  | AckError<"IN_GAME">;

export type ServerToClientEvents = {
  "room:chat": (chat: Chat) => void;
  "room:sync": (state: ClientState) => void;
  "game:error": (reason: string) => void;
};

export interface Chat {
  message: string;
  from: SocketId;
}

export type InterServerEvents = Record<string, never>;
