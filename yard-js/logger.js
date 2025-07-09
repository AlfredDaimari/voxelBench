// logger for logging bot positions in the minecraft world

const { createLogger, format, transports } = require("winston");

function createWinstonLogger(bot_name) {
  return createLogger({
    format: format.combine(
      format.timestamp({ format: () => Date.now() }), // unix epoch
      format.printf(({ timestamp, level, message }) => {
        return `${timestamp}, ${message}`;
      }),
    ),
    transports: [
      new transports.File({ filename: `logs/${bot_name}.log` }),
      new transports.Console(),
    ],
  });
}

module.exports = {
  createWinstonLogger,
};
