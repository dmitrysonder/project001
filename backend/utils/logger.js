const { createLogger, format, transports } = require('winston');
const { combine, splat, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message} `
  if (metadata) {
    if (metadata.file) {
      msg = `[${metadata.file}] ` + msg
    } else {
      msg += Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : ''
    }
  }
  return msg
});

exports.getLogger = function (fileName) {
  const logger = createLogger({
    level: 'info',
    format: combine(
      format.colorize(),
      splat(),
      timestamp(),
      myFormat
    ),
    defaultMeta: { file: fileName },
    transports: [
      new transports.File({ filename: './logs/error.log', level: 'error' }),
      new transports.File({ filename: './logs/combined.log', level: 'debug' }),
      new (transports.Console)({ level: 'info' }),
    ],
  });
  return logger
}