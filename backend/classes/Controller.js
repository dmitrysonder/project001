const ps = require('ps-node');
const db = require("../utils/db")
const { getLogger } = require('../utils/logger');
const logger = getLogger("Controller")
const { fork } = require('child_process');
const fs = require('fs')
const path = require('path');
const Executor = require('./Executor');
const utils = require('../utils/utils')

module.exports = class Controller {

    watchers = []

    constructor() {
        this.init()
    }

    async init() {
        this.executor = new Executor()
        await this.executor.init()
        await this.killProcesses()
        const orders = await db.getOrders("active")
        logger.info(`Loading watchers for ${orders.length} active orders from the database`)
        if (orders) {
            orders.forEach(order => this.createWatcher(order))
        }
        logger.info(`\n${this.watchers.map(watcher => `PID: ${watcher.worker.pid}, UUID: ${watcher.order.uuid}`).join("\n")}`)
        this.listen()
    }

    listen() {
        for (const watcher of this.watchers) {
            watcher.worker.on('message', async data => {
                logger.info(`Received trigger for order ${data?.uuid} with message:\n${data.msg}`)
                const watcher = this.getWatcher(data?.uuid)
                if (!watcher) throw Error(`Can't find watcher for ${data?.uuid}`)
                const tx = await this.executor.execute(watcher.order, data.data)
                this.handleTrade(tx, watcher)
            });
        }
    }

    async handleTrade(tx, watcher) {
        if (tx.ok) {
            await this.removeWatcher(watcher)
            await db.updateOrder(watcher.order.uuid, {
                status_: 'completed',
                reason: "transaction executed"
            })
            if (watcher.order.botId) await this.createNewBotTrade(watcher)
        } else {
            await this.killProcesses(watcher.worker.pid)
            await db.updateOrder(watcher.order.uuid, {
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

    async updateWatcher(uuid) {
        const watcher = this.getWatcher(uuid)
        if (watcher) {
            this.removeWatcher(watcher)
        }
        const order = await db.getOrder(uuid)
        this.createWatcher(order)
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

    createWatcher(order) {
        if (!order) throw new Error("Cant create order. Wrong params: " + JSON.stringify(order))
        if (order.status_ === 'active') {
            const execArgv = this.generateArgv(order)
            const options = {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            };
            const pathToWatcher = path.resolve(__dirname, "Watcher.js")
            if (!fs.existsSync(pathToWatcher)) {
                logger.error(`Path to watcher is not found`, pathToWatcher)
                throw Error("Wrong Watcher.js path")
            }
    
            logger.info(`Forking with params: ${execArgv}`)
            const worker = fork(pathToWatcher, execArgv, options);

            // quick fix after DynamoDB restricted to use uuid as sort key
            const modifiedOrder = {...order}
            delete modifiedOrder.uuid_
            modifiedOrder["uuid"] = order.uuid_
            this.watchers.push({
                order: modifiedOrder,
                worker
            })
            return true
        }
    }

    async removeWatcher(watcherOrUuid) {
        let watcher
        if (typeof watcherOrUuid === 'string') {
            watcher = this.getWatcher(watcherOrUuid)
        }
        await this.killProcesses(watcher.worker.pid)
        const index = this.watchers.findIndex(obj => obj.order.uuid === watcher.order.uuid)
        if (index > -1) {
            this.watchers.splice(index, 1)
        }
    }

    generateArgv(order) {
        const execArgv = [
            `--uuid=${order.uuid_}`,
            `--type=${order.type_}`,
            `--token0_decimals=${order.pair.token0.decimals}`,
            `--token1_decimals=${order.pair.token1.decimals}`,
            `--trigger_action=${order.trigger_.action}`,
            `--trigger_target=${order.trigger_.target}`,
            `--pair_pool=${order.pair.pool}`,
            `--exchange=${order.exchange}`,
            `--pair_name=${order.pair.token0.symbol}-${order.pair.token1.symbol}`
        ]
        return execArgv
    }

    getWatcher(uuid) {
        const watcher = this.watchers.find(obj => obj.order.uuid === uuid)
        return watcher
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
                return process?.arguments[0] === "Watcher.js" && pidMatch
            })
            if (watchers.length === 0) return true

            logger.info("Killing watchers...")
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



