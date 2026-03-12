import { Hono } from "hono";
import { makeInjectIoServerMiddleware } from "../middleware";
import { IoServer } from "../startup";

type GameRouteEnv = {
  Variables: { ioServer: IoServer };
};

export const makeGameRoute = (ioServer: IoServer) => {
  const route = new Hono<GameRouteEnv>();
  route.use("*", makeInjectIoServerMiddleware(ioServer));

  return route;
};
