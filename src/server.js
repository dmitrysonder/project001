const fastify = require('fastify')
const uuid = require('uuid');
const { logger } = require('./utils/logger')
const { config } = require("./utils/config")
const db = require("./utils/db")


const server = fastify()

server.get('/orders', async (request, reply) => {
  const orders = await db.scan({
    FilterExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": 'order',
    }
  })
  logger.info(request)
  reply
    .code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({
      status: "ok",
      orders: orders["Items"]
    })
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

server.listen(config.PORT, "0.0.0.0", (err, address) => {
  logger.warn(`Server is starting...`);
  if (err) {
    console.error(err)
    process.exit(1)
  }
  logger.info(`Server listening at ${address}`);
})