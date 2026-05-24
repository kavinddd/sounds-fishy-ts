import pino from "pino";

let hooks: pino.LoggerOptions["hooks"] | undefined;

if (process.env.NODE_ENV === "test") {
  const { prettyFactory } = require("pino-pretty");
  const prettify = prettyFactory({ sync: true, colorize: true });
  hooks = {
    streamWrite: (s) => {
      console.log(prettify(s)); // Mirror to console.log during tests
      return s;
    },
  };
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // ...(process.env.NODE_ENV === "test" && { sync: true }),
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
  // transport:
  //   process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test"
  //     ? {
  //         target: "pino-pretty",
  //         options: {
  //           colorize: true,
  //           translateTime: "HH:MM:ss",
  //           ignore: "pid,hostname",
  //         },
  //       }
  //     : undefined,
  //
  hooks,
});
