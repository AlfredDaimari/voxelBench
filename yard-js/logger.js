// logger for logging bot positions in the minecraft world

const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: () => Date.now() }), // unix epoch
    format.printf(({ timestamp, level, message }) => {
      return `${level}:${timestamp}:${message}`;
    }),
  ),
  transports: [
    new transports.File({ filename: "logs/bots.log" }),
    new transports.Console(),
  ],
});

module.exports = {
  logger,
};
