const ps = require('ps-node');
const db = require("../utils/db")
const { getLogger } = require('../utils/logger');
const logger = getLogger("Controller")
const { fork } = require('child_process');
const fs = require('fs')
const path = require('path');
const utils = require("../utils/utils")
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
                logger.info(`Received trigger for order ${data?.uuid_} with message:\n${data?.msg}`)
                if (!data?.order) logger.error(`Didn't receive order in data ${JSON.stringify(data)}`)
                const tx = await this.executor.execute(data?.order, data?.data)
                this.handleTrade(tx, watcher)
            });
        }
    }

    async handleTrade(tx, watcher) {
        if (tx) {
            await this.removeWatcher(watcher)
            await db.updateOrder(watcher.order.uuid, {
                status_: 'completed',
                reason: "transaction executed"
            })
            if (watcher.order.botId) await this.createNewBotTrade(watcher)
        } else {
            await this.killProcesses(watcher.worker.pid)
            await db.updateOrder(watcher.order.uuid_, {
                status_: 'active',
                reason: "transaction failed"
            })
        }
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
        const index = this.watchers.findIndex(obj => obj.order.uuid === watcher.order.uuid)
        if (index > -1) {
            this.watchers.splice(index, 1)
        }
    }

    async killProcesses(pid) {
        ps.lookup({
            command: 'node',
        }, function (err, resultList) {
            if (err) {
                throw new Error(err);
            }
            const watchers = resultList.filter(process => {
                const pidMatch = pid ? process.pid === pid : true
                return process?.arguments[0]?.includes("Watcher.js") && pidMatch
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

    getNeededNetworks(orders) {
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



