const fastify = require('fastify')
const { getLogger } = require('./utils/logger')
const logger = getLogger("server")
const { config } = require("./config")
const db = require("./utils/db")
const Controller = require("./classes/Controller")

const server = fastify()
server.register(require('fastify-cors'), {})


server.get('/orders', async (request, reply) => {
  const orders = await db.getOrders()
  reply
    .code(200)
    .send({
      status: "ok",
      orders
    })
})

server.post('/new', async (request, reply) => {
  if (!request.body) reply.code(400)
    .send(wrongRequestError)
  const response = await db.createOrder(request.body)
  if (response.error) reply.code(500)
  reply
    .code(201)
    .send(response)
})

server.post('/update', async (request, reply) => {
  const uuid = request.query.uuid
  if (!uuid) reply.code(400)

  const response = await db.updateOrder(uuid, request.body)
  if (response.error) reply.code(500)
  reply
    .code(201)
    .send(response)
})

server.post('/delete', async (request, reply) => {
  return 'order delete'
})





const controller = new Controller()
server.listen(config.PORT, "0.0.0.0", (err, address) => {
  logger.warn(`Server is starting...`);
  if (err) {
    console.error(err)
    process.exit(1)
  }
  logger.info(`Server listening at ${address}`);
})

function validateOrder(body) {
  return body
}