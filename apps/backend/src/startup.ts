import { healthRoute, makeGameRoute, userRoute } from "./routes";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "./telemetry";
import { logger as loggerMiddleware } from "hono/logger";
import { mountIoServer } from "./game-server";
// import { IoServer } from "../../../packages/shared/src";
import { IoServer } from "@sounds-fishy/shared";

export type AppServer = ReturnType<typeof makeApp>;
export type NodeServer = ReturnType<typeof serve>;

const makeApp = () => {
  const app = new Hono();
  return app;
};

const routeApp = (app: AppServer, io: IoServer) => {
  app.route("/", healthRoute);
  app.route("/users", userRoute);
  app.route("/io", makeGameRoute(io));
};

const gracefulShutdown = (server: NodeServer) => {
  process.on("SIGINT", () => {
    server.close();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    server.close((err) => {
      if (err) {
        logger.error(`Server is stopping from error ${err}`);
        process.exit(1);
      }
      process.exit(0);
    });
  });
};

interface StartupParam {
  port: number;
}

export const startup = ({ port }: StartupParam) => {
  const app = makeApp();
  app.use("*", loggerMiddleware());
  console.log(`Server running on http://localhost:${port}`);

  const server = serve({ fetch: app.fetch, port: port });
  const ioServer = mountIoServer(server);
  routeApp(app, ioServer);
  gracefulShutdown(server);
  return { server, app, ioServer };
};
