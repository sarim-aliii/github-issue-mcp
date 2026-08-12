import { config } from "./config.js";

function write(
  level: "INFO" | "DEBUG" | "WARN" | "ERROR",
  message: string,
  ...args: unknown[]
) {
  const prefix =
    `[${level}]`;

  if (args.length > 0) {
    console.error(
      prefix,
      message,
      ...args
    );
  } else {
    console.error(
      prefix,
      message
    );
  }
}

export const logger = {
  info(
    message: string,
    ...args: unknown[]
  ) {
    write(
      "INFO",
      message,
      ...args
    );
  },

  debug(
    message: string,
    ...args: unknown[]
  ) {
    if (!config.debug) {
      return;
    }

    write(
      "DEBUG",
      message,
      ...args
    );
  },

  warn(
    message: string,
    ...args: unknown[]
  ) {
    write(
      "WARN",
      message,
      ...args
    );
  },

  error(
    message: string,
    ...args: unknown[]
  ) {
    write(
      "ERROR",
      message,
      ...args
    );
  },
};