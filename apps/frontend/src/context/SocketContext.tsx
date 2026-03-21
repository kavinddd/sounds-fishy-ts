import { createContext, useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import type { ClientSocket, RoomId, Chat } from "@sounds-fishy/shared";

type SocketStatus = "idle" | "connecting" | "in-room" | "error";

interface SocketContextValue {
  socket: ClientSocket | null;
  status: SocketStatus;
  roomId: string | null;
  chats: Chat[];
  error: string | null;
  hostRoom: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendChat: (message: string) => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = "http://localhost:3001";

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket: ClientSocket = io(SOCKET_URL, {
      autoConnect: true,
    }) as ClientSocket;

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setStatus("idle");
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setStatus("idle");
      setRoomId(null);
      setChats([]);
    });

    newSocket.on("connect_error", () => {
      setStatus("error");
      setError("Cannot connect to server");
    });

    newSocket.on("room:hosted", (hostedRoomId) => {
      setRoomId(hostedRoomId);
      setStatus("in-room");
      setChats([]);
    });

    newSocket.on("room:joined", (joinedRoomId) => {
      setRoomId(joinedRoomId);
      setStatus("in-room");
      setChats([]);
    });

    newSocket.on("room:join_failed", (reason) => {
      setError(reason);
      setStatus("idle");
    });

    newSocket.on("room:chat", (chat) => {
      setChats((prev) => [...prev, chat]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const hostRoom = () => {
    if (socket) {
      setStatus("connecting");
      socket.emit("room:host");
    }
  };

  const joinRoom = (id: string) => {
    if (socket) {
      setStatus("connecting");
      socket.emit("room:join", id as RoomId);
    }
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit("room:leave");
      setRoomId(null);
      setStatus("idle");
      setChats([]);
    }
  };

  const sendChat = (message: string) => {
    if (socket && roomId) {
      socket.emit("room:chat", message);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        status,
        roomId,
        chats,
        error,
        hostRoom,
        joinRoom,
        leaveRoom,
        sendChat,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
