const fastify = require('fastify')
const { getLogger } = require('./utils/logger')
const logger = getLogger("server")
const { config } = require("./config")
const db = require("./utils/db")
const utils = require("./utils/utils")
const Controller = require("./classes/Controller")
const { EventEmitter, on } = require('events')

const server = fastify()
server.register(require('fastify-cors'), {})
server.register(require('fastify-sse-v2'), {})
const eventEmitter = new EventEmitter();
const controller = new Controller(eventEmitter)


server.get("/sse", function (req, res) {
  res.sse(
    (async function* () {
      for await (const event of on(eventEmitter, "ServerEvent")) {
        yield {
          type: event.name,
          data: JSON.stringify(event),
        };
      }
    })()
  );
});

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
    .send("Wrong request. Use POST with body")
  const payload = await validateOrder(request.body)
  if (!payload) reply.code(400)
    .send("Fill all inputs")
  let response;
  if (payload.type_ === 'bot') {
    response = await controller.createBot(payload)
  } else {
    response = await controller.createOrder(payload)
  }
  if (!response) reply.code(500)
  logger.debug("Order created")
  reply
    .code(201)
    .send(response)
})

server.post('/update', async (request, reply) => {
  const uuid = request.query.uuid
  if (!uuid) reply.code(400)
  const response = await db.updateOrder(uuid, request.body)
  if (response.error) reply.code(500)
  await controller.onDbUpdate(response?.Attributes?.exchange)
  reply
    .code(200)
    .send(response)
})

server.post('/delete', async (request, reply) => {
  const uuid = request.query.uuid
  if (!uuid) reply.code(400)
  const order = request.body.order
  const dbUpdated = await db.deleteOrder(uuid)
  if (!dbUpdated) reply.code(500)
  await controller.onDbUpdate(order.exchange)
  reply
    .code(200)
    .send(dbUpdated)
})

server.get('/switch', async (request, reply) => {
  const IS_TESTNET = request.query.IS_TESTNET
  if (IS_TESTNET === undefined || typeof IS_TESTNET !== 'boolean') reply.code(400)
  process.env['IS_TESTNET'] = IS_TESTNET
  reply
    .code(200)
    .send({ IS_TESTNET })
})



server.listen(config.PORT, "0.0.0.0", async (err, address) => {
  logger.info(`Server is starting...`);
  if (err) {
    console.error(err)
    process.exit(1)
  }
  await controller.init()
  logger.info(`Server listening at ${address}`);
})

async function validateOrder(body) {
  // const emptyValues = Object.keys(body).filter(key => body.orderType === 'timestamp' && key === 'token1' ? body[key] : false)
  // if (emptyValues.length > 0) {
  //   return false
  // }
  
  const executor = controller.getExecutorByExchange(body.exchange)

  const [token0, token1, pool] = await Promise.all([
    executor.recognizeToken(body.token0, body.exchange),
    executor.recognizeToken(body.token1, body.exchange),
    executor.recognizePool(body.token0, body.token1)
  ])
  // const token0 = await executor.recognizeToken(body.token0, body.exchange)
  // const token1 = await executor.recognizeToken(body.token1, body.exchange)
  //const pool = await executor.recognizePool(token0.address, token1.address)
  const trigger_ = utils.recognizeTrigger(body)
  return {
    execution: {
      amount: body.amount,
      gasPrice: body.gasPrice,
      maxSlippage: body.maxSlippage
    },
    pair: {
      pool,
      token0,
      token1
    },
    status_: "active",
    type_: body.orderType,
    trigger_,
    exchange: body.exchange
  }
}