import {
  IoServer,
  IoSocket,
  RoomId,
  SocketId,
  SocketState,
} from "@sounds-fishy/shared";
import { createMiddleware } from "hono/factory";
import { ExtendedError } from "socket.io";

// region: hono

// Middleware to inject io server into hono context
export const makeInjectIoServerMiddleware = (ioServer: IoServer) =>
  createMiddleware<{ Variables: { ioServer: IoServer } }>(async (c, next) => {
    c.set("ioServer", ioServer);
    await next();
  });

// endregion

// region: io

// endregion
