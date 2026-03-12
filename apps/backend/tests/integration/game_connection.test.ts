import { afterAll, beforeAll, describe, it } from "vitest";
import { RunningServer, unsafeRunServer } from "../utils/server";

let server: RunningServer;

beforeAll(() => {
  server = unsafeRunServer();
});
afterAll(() => {
  server.server.close();
});

describe("socket", () => {
  it("test", async () => {
    console.log(server);
  });
});
