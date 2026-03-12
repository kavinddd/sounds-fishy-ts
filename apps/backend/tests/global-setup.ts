import { beforeAll, afterAll, vi } from "vitest";

// const globalSetup = () => {
//   if (!process.env.DATABASE_URL) {
//     process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/test_db";
//   }
// };
//
// beforeAll(() => {
//   // Ensure DATABASE_URL is set for each test
//   process.env.DATABASE_URL =
// });
//
// afterAll(() => {
//   vi.resetAllMocks();
// });
//
// export default globalSetup;

export async function setup() {
  // await new Promise<void>((resolve) => {
  //   server = serve({ fetch: app.fetch, port: 3001 }, () => resolve())
  //   const io = new Server(server)
  //   // setup io handlers...
  // })
  //
  // expose port to tests via env
  //
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/test_db";
  // process.env.TEST_PORT = "3001";
}

export async function teardown() {
  // await new Promise<void>((resolve) => server.close(() => resolve()))
}
