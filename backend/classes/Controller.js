const ps = require('ps-node');
const db = require("../utils/db")
const { getLogger } = require('../utils/logger');
const logger = getLogger("Controller")
const { fork } = require('child_process');
const fs = require('fs')
const path = require('path');
const utils = require("../utils/utils")
const { config } = require('../config')
const Executor = require('./Executor');

module.exports = class Controller {

    constructor() {
        this.watchers = []
    }

    async init() {
        this.executor = new Executor()
        await this.executor.init()
        await this.killProcesses()
        await this.runWatchers()
        this.listen()
    }

    async runWatchers() {
        const orders = await db.getOrders("active")
        const networks = this.getNeededNetworks(orders)
        for (const network of networks) {

            const args = [`--network=${network}`]
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
                logger.info(`Received trigger for order ${data?.order.uuid_} with message:\n${data?.msg}`)
                if (!data?.order) logger.error(`Didn't receive order in data ${JSON.stringify(data)}`)
                const tx = await this.executor.execute(data.order, data.data)
                this.handleTrade(tx, data.order)
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
            if (order.botId) await this.createNewBotTrade(watcher)
        } else {
            logger.warn(`Swap failed with the code: ${tx.receipt.code}`)
            await db.updateOrder(order.uuid_, {
                status_: 'failed',
                receipt: tx.receipt
            })
            this.onDbUpdate(order.exchange)
        }
    }

    async createOrder(order) {
        this.approve(order)
        logger.debug("Creating new order")
        const response = await db.createOrder(order)
        if (response.err) return false
        this.onDbUpdate(response?.Attributes?.exchange)
        return response
    }


    async createNewBotTrade(watcher) {
        const bot = await db.getBot(watcher.order.botId)
        const activeOrders = await db.getBotOrders(botId)
        const lastCompletedOrder = await db.getBotLastCompletedTrade(botId)
        if (activeOrders.length === 0) {
            const response = await db.createOrder({
                execution: {
                    amount: bot.amount,
                    deadline: config.DEFAULT_DEADLINE,
                    gasPrice: bot.gasPrice,
                    maxSlippage: bot.maxSlippage
                },
                pair: bot.pair,
                status_: "active",
                type_: "price",

                trigger_: {
                    action: lastCompletedOrder._trigger.action === 'buy' ? 'sell' : 'buy',
                    target: lastCompletedOrder._trigger.action === 'buy' ? bot.amountToSell : bot.amountToBuy
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
            this.init()
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



