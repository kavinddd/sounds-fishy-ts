import { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./event";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
