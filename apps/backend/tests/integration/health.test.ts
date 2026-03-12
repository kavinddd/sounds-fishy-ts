import { describe, it, expect } from "vitest";
import { server } from "../../src";

describe("Health API", () => {
  it("returns ok status", async () => {
    const res = await server.app.request("/health");
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
