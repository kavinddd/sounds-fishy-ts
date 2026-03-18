import { Hono } from "hono";
import { makeInjectIoServerMiddleware } from "../middleware";
import { IoServer } from "../../src/game-server";
import { logger } from "../telemetry";

type GameRouteEnv = {
  Variables: { io: IoServer };
};

export const makeGameRoute = (ioServer: IoServer) => {
  const route = new Hono<GameRouteEnv>();
  route.use("*", makeInjectIoServerMiddleware(ioServer));

  return route;
};
