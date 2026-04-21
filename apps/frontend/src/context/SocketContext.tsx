import { createContext, useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type {
  ClientSocket,
  ClientGameState,
  ClientState,
  RoomId,
  Chat,
  SocketId,
} from "@sounds-fishy/shared";

type SocketStatus = "idle" | "connecting" | "in-room" | "in-game" | "error";

interface SocketContextValue {
  socket: ClientSocket | null;
  playerId: string | null;
  status: SocketStatus;
  roomId: string | null;
  roomState: ClientState | null;
  chats: Chat[];
  error: string | null;
  isHost: boolean;
  gameState: ClientGameState | null;
  hostRoom: () => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  sendChat: (message: string) => Promise<void>;
  startGame: () => Promise<void>;
  selectHinter: (socketId: string) => Promise<void>;
  giveHint: (hint: string) => Promise<void>;
  eliminate: (socketId: string) => Promise<void>;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = "http://localhost:3001";

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<ClientState | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);

  const gameState = roomState?.isPlaying
    ? (roomState as ClientState & { isPlaying: true }).game
    : null;

  useEffect(() => {
    const newSocket: ClientSocket = io(SOCKET_URL, {
      autoConnect: true,
    }) as ClientSocket;

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setPlayerId(newSocket.id ?? null);
      setStatus("idle");
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setPlayerId(null);
      setStatus("idle");
      setRoomId(null);
      setRoomState(null);
      setChats([]);
    });

    newSocket.on("connect_error", () => {
      setStatus("error");
      setError("Cannot connect to server");
    });

    newSocket.on("room:sync", (state: ClientState) => {
      setRoomId(state.id);
      setRoomState(state);
      if (state.isPlaying) {
        setStatus("in-game");
      } else {
        setStatus("in-room");
      }
    });

    newSocket.on("room:chat", (chat: Chat) => {
      setChats((prev) => [...prev, chat]);
    });

    newSocket.on("game:error", (reason: string) => {
      setError(reason);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const hostRoom = async () => {
    if (!socket) return;
    
    setStatus("connecting");
    setError(null);

    const ack = await socket.emitWithAck("room:host");
    
    if (ack.success) {
      setRoomId(ack.data);
      setChats([]);
    } else {
      setStatus("idle");
      setError(getErrorMessage(ack.code, "host"));
    }
  };

  const joinRoom = async (id: string) => {
    if (!socket) return;
    
    setStatus("connecting");
    setError(null);

    const ack = await socket.emitWithAck("room:join", id as RoomId);
    
    if (ack.success) {
      setRoomId(id);
      setChats([]);
    } else {
      setStatus("idle");
      setError(getErrorMessage(ack.code, "join"));
    }
  };

  const leaveRoom = async () => {
    if (!socket) return;

    const ack = await socket.emitWithAck("room:leave");
    
    if (ack.success) {
      setRoomId(null);
      setRoomState(null);
      setStatus("idle");
      setChats([]);
    }
  };

  const sendChat = async (message: string) => {
    if (!socket || !roomId) return;

    const ack = await socket.emitWithAck("room:chat", message);
    
    if (!ack.success) {
      setError(getErrorMessage(ack.code, "chat"));
    }
  };

  const startGame = async () => {
    if (!socket || !roomId) return;

    const ack = await socket.emitWithAck("game:start");

    if (!ack.success) {
      setError(getErrorMessage(ack.code, "start"));
    }
  };

  const selectHinter = async (socketId: string) => {
    if (!socket || !roomId) return;

    const ack = await socket.emitWithAck("game:select-hinter", socketId as SocketId);

    if (!ack.success) {
      setError(getErrorMessage(ack.code, "select-hinter"));
    }
  };

  const giveHint = async (hint: string) => {
    if (!socket || !roomId) return;

    const ack = await socket.emitWithAck("game:hint", hint);

    if (!ack.success) {
      setError(getErrorMessage(ack.code, "hint"));
    }
  };

  const eliminate = async (socketId: string) => {
    if (!socket || !roomId) return;

    const ack = await socket.emitWithAck("game:eliminate", socketId as SocketId);

    if (!ack.success) {
      setError(getErrorMessage(ack.code, "eliminate"));
    }
  };

  const isHost = roomState !== null && playerId !== null && roomState.hostId === playerId;

  return (
    <SocketContext.Provider
      value={{
        socket,
        playerId,
        status,
        roomId,
        roomState,
        chats,
        error,
        isHost,
        gameState,
        hostRoom,
        joinRoom,
        leaveRoom,
        sendChat,
        startGame,
        selectHinter,
        giveHint,
        eliminate,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

function getErrorMessage(code: string, action: string): string {
  const messages: Record<string, Record<string, string>> = {
    host: {
      IN_ROOM: "You are already in a room",
      UNEXPECTED: "Failed to host room",
    },
    join: {
      IN_ROOM: "You are already in a room",
      IN_GAME: "Room is already in game",
      FULL: "Room is full",
      UNEXPECTED: "Failed to join room",
    },
    chat: {
      NO_ROOM: "You are not in a room",
      UNEXPECTED: "Failed to send message",
    },
    start: {
      NO_ROOM: "You are not in a room",
      NOT_HOST: "Only the host can start the game",
      NOT_ENOUGH: "Need at least 3 players",
      IN_GAME: "Game is already in progress",
      UNEXPECTED: "Failed to start game",
    },
    "select-hinter": {
      NOT_MASTER: "Only the master can select a hinter",
      NOT_YOUR_TURN: "Not your turn",
      ALREADY: "This player already gave a hint",
      UNEXPECTED: "Failed to select hinter",
    },
    hint: {
      NOT_HINTER: "You are not the current hinter",
      NOT_YOUR_TURN: "Not your turn",
      ANSWER: "Invalid hint",
      UNEXPECTED: "Failed to give hint",
    },
    eliminate: {
      NOT_MASTER: "Only the master can eliminate",
      NOT_YOUR_TURN: "Not your turn",
      UNEXPECTED: "Failed to eliminate",
    },
  };

  return messages[action]?.[code] ?? `Failed to ${action}`;
}
