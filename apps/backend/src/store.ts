import {
  RoomId,
  ServerState,
  SocketId,
  SocketState,
} from "@sounds-fishy/shared";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

type GetError = "NOT FOUND";
type SetError = "STORE ERROR";

interface StateStore<K, U> {
  get: (id: K) => ResultAsync<U, GetError>;
  set: (id: K, state: U) => ResultAsync<void, SetError>;
  clear: () => ResultAsync<void, SetError>;
  del: (id: K) => ResultAsync<void, SetError>;
}

export const createInMemoryState = <K, U>(): StateStore<K, U> => {
  const map = new Map<K, U>();
  return {
    get: (id: K): ResultAsync<U, GetError> => {
      const state = map.get(id);
      if (!state) {
        return errAsync("NOT FOUND");
      }
      return okAsync(state);
    },
    set: (id: K, state: U): ResultAsync<void, SetError> => {
      map.set(id, state);
      return okAsync();
    },
    clear: () => {
      map.clear();
      return okAsync();
    },
    del: (id: K) => {
      map.delete(id);
      return okAsync();
    },
  };
};

export const rooms = createInMemoryState<RoomId, ServerState>();
export const sockets = createInMemoryState<SocketId, SocketState>();
