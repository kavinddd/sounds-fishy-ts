import { RoomId, SocketId } from "./domain";
import { ClientState } from "./io";

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

  // start the game
  "game:start": Ack<void, StartError["code"]>;

  // master selects hinter
  "game:select-hinter": (
    socketId: SocketId,
    ack: AckCallback<void, SelectHinterError["code"]>,
  ) => void;

  // hinter hints
  // red fish cannot give hint that have the same as the answer
  // blue fish cannot give hint thet unlike the answer
  "game:hint": (
    hint: string,
    ack: AckCallback<void, HintError["code"]>,
  ) => void;

  // master eliminate red fish
  // if eliminate red fish and there are more red fish, continue eliminating
  // if eliminate blue fish or red fish are all dead, then the score is being updated
  "game:eliminate": (
    socketId: SocketId,
    ack: AckCallback<void, EliminateError["code"]>,
  ) => void;
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

export type SelectHinterError =
  | UnexpectedError
  | AckError<"NOT_MASTER">
  | AckError<"NOT_YOUR_TURN">
  | AckError<"ALREADY">;

export type HintError =
  | UnexpectedError
  | AckError<"NOT_HINTER">
  | AckError<"NOT_YOUR_TURN">
  | AckError<"ANSWER">;

export type AnswerError =
  | UnexpectedError
  // | AckError<"WRONG">
  | AckError<"NOT_MASTER">;

export type EliminateError =
  | UnexpectedError
  | AckError<"NOT_MASTER">
  | AckError<"NOT_YOUR_TURN">;

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
export function ackOk<T>(data?: T): AckOk<T> | AckOk<void> {
  if (data === undefined) return { success: true } as AckOk<void>;
  return { success: true as const, data } as AckOk<T>;
}
export const ackErr = <E extends string>(code: E): AckError<E> => ({
  success: false,
  code,
});

export type AckError<Code extends string> = {
  success: false;
  code: Code;
};
