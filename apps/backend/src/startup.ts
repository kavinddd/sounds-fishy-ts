import { healthRoute, makeGameRoute, userRoute } from "./routes";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { Server } from "socket.io";

export type AppServer = ReturnType<typeof makeApp>;
export type IoServer = ReturnType<typeof makeIoServer>;
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
        console.error(err);
        process.exit(1);
      }
      process.exit(0);
    });
  });
};

export const makeIoServer = (server: NodeServer) => {
  const ioServer = new Server(server);
  return ioServer;
};

export const startup = (port: number) => {
  const app = makeApp();
  app.use("*", logger());
  console.log(`Server running on http://localhost:${port}`);

  const server = serve({ fetch: app.fetch, port: port });
  const ioServer = makeIoServer(server);
  routeApp(app, ioServer);
  gracefulShutdown(server);
  return { server, app };
};
