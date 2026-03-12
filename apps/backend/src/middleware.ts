import { createMiddleware } from "hono/factory";
import { IoServer } from ".";

// Middleware to inject io server into context
export const makeInjectIoServerMiddleware = (ioServer: IoServer) =>
  createMiddleware<{ Variables: { ioServer: IoServer } }>(async (c, next) => {
    c.set("ioServer", ioServer);
    await next();
  });
