import fastify from 'fastify'
import {logger} from './utils/logger';
import {config} from "./utils/config"

const server = fastify()

server.get('/orders', async (request, reply) => {
  logger.info("orders")
  return 'list of ordesssrs'
})

server.get('/new', async (request, reply) => {
  return 'new order created'
})

server.get('/update', async (request, reply) => {
  return 'order updating'
})

server.get('/delete', async (request, reply) => {
  return 'order delete'
})

server.listen(config.PORT, (err, address) => {
  logger.warn(`Server is starting...`);
  if (err) {
    console.error(err)
    process.exit(1)
  }
  logger.info(`Server listening at ${address}`);
})