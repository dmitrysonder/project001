const fastify = require('fastify')
const { getLogger } = require('./utils/logger')
const logger = getLogger("server")
const { config } = require("./config")
const db = require("./utils/db")
const utils = require("./utils/utils")
const Controller = require("./classes/Controller")

const server = fastify()
server.register(require('fastify-cors'), {})
const controller = new Controller()

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
    logger.debug("Creating new bot with")
    response = await db.createBot(payload)
  } else {
    logger.debug("Creating new order")
    response = await db.createOrder(payload)
  }
  if (response.error) reply.code(500)
  const watcherCreated = controller.createWatcher(response.Items[0])

  if (!watcherCreated) reply.code(500)
  reply
    .code(201)
    .send(response)
})

server.post('/update', async (request, reply) => {
  const uuid = request.query.uuid
  if (!uuid) reply.code(400)
  console.log("Updating", request.body)
  const response = await db.updateOrder(uuid, request.body)
  await controller.updateWatcher(uuid)
  if (response.error) reply.code(500)
  reply
    .code(200)
    .send(response)
})

server.post('/delete', async (request, reply) => {
  const uuid = request.query.uuid
  if (!uuid) reply.code(400)

  const dbUpdated = await db.deleteOrder(uuid)
  if (!dbUpdated) reply.code(500)
  await controller.removeWatcher(uuid)
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
    .send({IS_TESTNET})
})



server.listen(config.PORT, "0.0.0.0", (err, address) => {
  logger.info(`Server is starting...`);
  if (err) {
    console.error(err)
    process.exit(1)
  }
  logger.info(`Server listening at ${address}`);
})

async function validateOrder(body) {
  // const emptyValues = Object.keys(body).filter(key => body.orderType === 'timestamp' && key === 'token1' ? body[key] : false)
  // if (emptyValues.length > 0) {
  //   return false
  // }
  const token0 = await utils.recognizeToken(body.token0)
  const token1 = await utils.recognizeToken(body.token1)
  const pool = await utils.recognizePool(token0,token1)
  const trigger_ = utils.recognizeTrigger(body)
  return {
    execution: {
      amount: body.amount,
      deadline: config.DEFAULT_DEADLINE,
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