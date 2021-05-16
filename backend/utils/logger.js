const { createLogger, format, transports } = require('winston');
const { combine, splat, timestamp, printf } = format;

const myFormat = printf( ({ level, message, timestamp, ...metadata}) => {
  let msg = `${timestamp} [${level}] : ${message} `  
  if(metadata) {
    if (metadata.file) {
      msg = `[${metadata.file}] ` + msg
    } else {
      msg += JSON.stringify(metadata)
    }
  }
  return msg
});

exports.logger = createLogger({
    level: 'info',
    format: combine(
      format.colorize(),
      splat(),
      timestamp(),
      myFormat
    ),
    transports: [
      new transports.File({ filename: './logs/error.log', level: 'error' }),
      new transports.File({ filename: './logs/combined.log' }),
      new (transports.Console)({ level: 'info' }),
    ],
});