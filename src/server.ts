import fastify from 'fastify'
import * as winston from 'winston';
import {config} from "./utils/config"

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'server' },
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' }),
  ],
});
const server = fastify()

server.get('/ping', async (request, reply) => {
  return 'pong\n'
})

server.listen(config.PORT, (err, address) => {
  logger.warn(`Server is starting...`);
  if (err) {
    console.error(err)
    process.exit(1)
  }
  logger.info(`Server listening at ${address}`);
})