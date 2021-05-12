const fastify = require('fastify')
const uuid = require('uuid');
const { logger } = require('./utils/logger')
const { config } = require("./config")
const db = require("./utils/db");
const { wrongRequestError } = require("./utils/errors")
const { headers } = require("")

const server = fastify()
server.register(require('fastify-cors'), {})

server.get('/orders', async (request, reply) => {
  const orders = await db.scan({
    FilterExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": 'order',
    }
  })

  reply
    .code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({
      status: "ok",
      orders: orders["Items"]
    })
})

server.post('/new', async (request, reply) => {

  if (!request.body?.uuid) reply.code(400)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(wrongRequestError)

  const response = await createOrder(uuid())
  if (response.error) reply.code(500)
  reply
    .code(201)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(response)
  return wrongRequestError
})

server.post('/update', async (request, reply) => {
  console.log(request.body.uuid)
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

async function createOrder(uuid) {
  const response = await db.update({
    Key: { "pk": "order", "sk": uuid() },
    data: generateOrder()
  })
  return response
}

function generateOrder() {
  return {
    status: "open",
    type: "buy",
    amount: "9999",
  }
}