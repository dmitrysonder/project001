const ps = require('ps-node');
const db = require("../utils/db")
const { getLogger } = require('../utils/logger');
const logger = getLogger("Controller")
const { fork } = require('child_process');
const fs = require('fs')
const path = require('path');
const utils = require("../utils/utils")
const Executor = require('./Executor');
const AWS = require('aws-sdk')
const {config} = require('../config')
const sm = new AWS.SecretsManager({
    region: config.AWS_REGION
})
const ethers = require('ethers')

module.exports = class Controller {

    constructor(eventEmitter) {
        this.watchers = []
        this.eventEmitter = eventEmitter
    }

    async init() {
        const accountSeed = await sm.getSecretValue({ SecretId: config.BOT_MNEMONIC_KEY }).promise().then(data => data["SecretString"])
        const seedString = JSON.parse(accountSeed)["mnemonic"]
        const account = new ethers.Wallet.fromMnemonic(seedString)
        this.account = account
        this.executor = new Executor()
        this.executor.eventEmitter = this.eventEmitter
        await this.executor.init(account)
        await this.killProcesses()
        await this.runWatchers()
        this.listen()
    }

    async runWatchers() {
        const orders = await db.getOrders("active")
        const networks = this.getNeededNetworks(orders)
        for (const network of networks) {

            const args = [`--network=${network}`, `--accountAddress=${this.account.address}`]
            const options = {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            };
            const pathToWatcher = path.resolve(__dirname, "Watcher.js")
            if (!fs.existsSync(pathToWatcher)) {
                logger.error(`Path to watcher is not found`, pathToWatcher)
                throw Error("Wrong Watcher.js path")
            }
            logger.info(`Initializing watcher for ${network} network with params: ${args.join(" ")}`)
            const worker = fork(pathToWatcher, args, options);
            this.watchers.push({
                worker,
                network
            })
            //logger.info(`${network} watcher is initialized`)
        }

        logger.info(`\n${this.watchers.map(watcher => `PID: ${watcher.worker.pid}, NETWORK: ${watcher.network}`).join("\n")}`)
    }

    listen() {
        for (const watcher of this.watchers) {
            watcher.worker.on('message', async data => {
                if (!data?.order) logger.error(`Didn't receive order in data ${JSON.stringify(data)}`)
                switch (data.type) {
                    case 'price' || 'timestamp':
                        this.eventEmitter.emit('ServerEvent', { type: 'status', uuid: data.order.uuid_, value: 'triggered' })
                        logger.info(`${data.msg}`)
                        this.handleTrade(await this.executor.execute(data.order, data.data), data.order)
                    case 'frontRunning':
                        this.eventEmitter.emit('ServerEvent', { type: 'status', uuid: data.order.uuid_, value: 'triggered' })
                        logger.info(`${data.msg}`)
                        this.handleTrade(await this.executor.execute(data.order, data.data), data.order)
                    case 'info':
                        logger.debug(`Price notification ${data.order.pair.token0.symbol}-${data.order.pair.token1.symbol}: ${data.price}`)
                        this.eventEmitter.emit('ServerEvent', { type: 'price', uuid: data.order.uuid_, value: data.price })
                }
            });
        }
    }

    approve(order) {
        this.executor.approve(order)
    }

    async handleTrade(tx, order) {
        if (tx.status === 'confirmed') {
            logger.info(`Swap confirmed: ${tx.receipt.transactionHash}`)

            await db.updateOrder(order.uuid_, {
                status_: 'completed',
                receipt: tx.receipt
            })
            this.eventEmitter.emit('ServerEvent', { type: 'status', uuid: order.uuid_, value: 'completed', tx })
            if (order.botId) await this.createNewBotTrade(order)
        } else {
            logger.warn(`Swap failed with the code: ${tx.receipt.code}`)

            await db.updateOrder(order.uuid_, {
                status_: 'failed',
                receipt: tx.receipt
            })
            this.eventEmitter.emit('ServerEvent', { type: 'status', uuid: order.uuid_, value: 'failed', tx })
        }
        this.onDbUpdate(order.exchange)
    }

    async createOrder(order) {
        this.approve(order)
        logger.debug("Creating new order")
        const response = await db.createOrder(order)
        if (response.err) return false
        this.onDbUpdate(response?.Attributes?.exchange)
        return response
    }

    async createBot(order) {
        const response = await db.createBot(order)
        const botId = response?.Attributes?.uuid_
        this.approve(order)
        logger.debug(`Creating new bot order for botId ${botId}`)
        order.botId = botId
        await this.createOrder(order)
    }


    async createNewBotTrade(order) {
        const bot = await db.getBot(order.botId)
        const activeOrders = await db.getBotOrders(botId)
        if (activeOrders.length === 0) {
            const response = await db.createOrder({
                execution: {
                    amount: bot.amount,
                    gasPrice: bot.gasPrice,
                    maxSlippage: bot.maxSlippage
                },
                pair: bot.pair,
                status_: "active",
                type_: "price",
                trigger_: {
                    action: order._trigger.action === 'buy' ? 'sell' : 'buy',
                    target: order._trigger.action === 'buy' ? bot.amountToSell : bot.amountToBuy
                },
                exchange: bot.exchange
            })
            this.createWatcher(response["Items"][0])
        }
    }

    // Recognize what worker should be reloaded, by uuid of order
    async onDbUpdate(exchange) {
        logger.info('Updating watchers')
        const network = utils.getNetworkByExchange(exchange)
        const watcher = this.watchers.find(watcher => watcher.network === network)
        if (watcher) {
            watcher.worker.send({
                msg: "update"
            })
        } else {
            logger.warn(`Can't find watcher for network: ${network}. Initializing...`)
            await this.killProcesses()
            await this.runWatchers()
            this.listen()
        }
    }

    getExecutorByExchange(exchange) {
        switch (exchange) {
            case 'uniswap':
                return this.executor.uniswap
            case 'pancake':
                return this.executor.pancake
            case 'sushiswap':
                return this.executor.sushiswap
            case 'quickswap':
                return this.executor.quickswap
        }
    }

    async removeWatcher(watcher) {
        await this.killProcesses(watcher.worker.pid)
        const index = this.watchers.findIndex(obj => obj.order.uuid_ === watcher.order.uuid_)
        if (index > -1) {
            this.watchers.splice(index, 1)
        }
    }

    async killProcesses(pid) {
        if (pid) {
            const worker = this.watchers.find(watcher => watcher.worker.pid === pid)
            if (!worker) logger.error(`Cant find worker with PID: ${pid}`)
            ps.kill(pid, (err) => {
                logger.error(err)
            })
        } else {
            ps.lookup({
                command: 'node',
            }, function (err, resultList) {
                if (err) {
                    throw new Error(err);
                }
                const watchers = resultList.filter(process => {
                    return process?.arguments[0]?.includes("Watcher.js")
                })
                logger.info(`Killing ${watchers.length} active watchers processes..`)
                watchers.forEach(function (process) {
                    if (process) {
                        ps.kill(process.pid, function (err) {
                            if (err) {
                                throw new Error(err);
                            }
                            else {
                                logger.info('Process %s has been killed!', pid);
                            }
                        });
                    }
                });
            });
        }
    }

    getNeededNetworks(orders) {
        if (!orders) return []
        const exchanges = new Set(orders.map(order => order.exchange))
        const networks = []
        for (const exchange of exchanges) {
            const network = utils.getNetworkByExchange(exchange)
            if (!networks.includes(network)) {
                networks.push(network)
            }
        }
        return networks
    }
}



