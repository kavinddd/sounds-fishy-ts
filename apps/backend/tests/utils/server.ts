import { ServerType } from "@hono/node-server";
import { AddressInfo } from "net";
import { err, ok, Result } from "neverthrow";
import { startup } from "../../src/startup";
import { IoServer } from "@sounds-fishy/shared";

export interface RunningServer {
  server: ServerType;
  address: AddressInfo;
  io: IoServer;
}

type RunServerError = { message: string };

export const runServer = (): Result<RunningServer, RunServerError> => {
  const server = startup({ port: 0 });
  const address = server.server.address();

  if (!address || typeof address === "string") {
    return err({ message: "Unexpected error: " + address });
  }

  return ok({ server: server.server, address, io: server.ioServer });
};

export const unsafeRunServer = () => runServer()._unsafeUnwrap();
