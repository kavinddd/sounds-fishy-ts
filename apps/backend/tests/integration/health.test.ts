import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { RunningServer, unsafeRunServer } from "../utils/server";
let server: RunningServer;

beforeAll(() => {
  server = unsafeRunServer();
});

afterAll(() => {
  server.server.close();
});

describe("Health API", () => {
  it("returns ok status", async () => {
    const response = await fetch(
      `http://localhost:${server.address.port}/health`,
    );

    expect(response.status).toEqual(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});
