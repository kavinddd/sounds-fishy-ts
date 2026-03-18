import { IoServer } from "@sounds-fishy/shared";
import { createMiddleware } from "hono/factory";

// Middleware to inject io server into context
export const makeInjectIoServerMiddleware = (ioServer: IoServer) =>
  createMiddleware<{ Variables: { ioServer: IoServer } }>(async (c, next) => {
    c.set("ioServer", ioServer);
    await next();
  });
