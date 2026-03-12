import { ServerType } from "@hono/node-server";
import { AddressInfo } from "net";
import { err, ok, Result } from "neverthrow";
import { startup } from "../../src/startup";

export interface RunningServer {
  server: ServerType;
  address: AddressInfo;
}

type RunServerError = { message: string };

export const runServer = (): Result<RunningServer, RunServerError> => {
  const server = startup(0);
  const address = server.server.address();

  if (!address || typeof address === "string") {
    return err({ message: "Unexpected error: " + address });
  }

  return ok({ server: server.server, address });
};

export const unsafeRunServer = () => runServer()._unsafeUnwrap();
