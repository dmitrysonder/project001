const ps = require('ps-node');
const db = require("../utils/db")
const { getLogger } = require('../utils/logger');
const logger = getLogger("Controller")
const { fork } = require('child_process');
const fs = require('fs')
const path = require('path');
const  Executor  = require('./Executor');

module.exports = class Controller {

    watchers = []

    constructor() {
        this.init()
    }

    async init() {
        this.executor = new Executor()

        await this.killWatchers()
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
                logger.info(`Received trigger for order ${data.uuid} with message:\n${data.msg}`)
                const watcher = this.watchers.find(obj => obj.order.uuid === data.uuid)
                if (!watcher) throw Error(`Can't find watcher for ${data.uuid}`)
                const tx = await this.executor.execute(watcher.order)
                this.handleTrade(tx, watcher)
            });
        }
    }

    async handleTrade(tx, watcher) {
        if (tx.ok) {
            await this.killTrade(watcher)
            if (watcher.order.bot) await this.createNewBotTrade(watcher.order.bot)
        } else {
            await this.pauseTrade(watcher, "transaciton failed")
        }
    }

    async killTrade(watcher) {
        await this.killWatchers(watcher.worker.pid)
        await db.deleteOrder(watcher.order.uuid)
    }

    async pauseTrade(watcher, reason) {
        await this.killWatchers(watcher.worker.pid)
        await this.updateOrderStatus(watcher.order.uuid, 'paused', reason)
    }

    async updateOrderStatus(uuid, status, reason) {
        await db.updateOrder(uuid, {
            status_: status,
            reason: reason
        })
    }

    createWatcher(order) {
        const execArgv = this.generateArgv(order)
        const options = {
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
        };
        const pathToWatcher = path.resolve(__dirname, "Watcher.js")
        if (!fs.existsSync(pathToWatcher)) {
            logger.error(`Path to watcher is not found` , pathToWatcher)
            throw Error("Wrong Watcher.js path")
        }

        const worker = fork(pathToWatcher, execArgv, options);
        this.watchers.push({
            order,
            worker
        })
    }

    generateArgv(order) {
        const execArgv = [
            `--uuid=${order.uuid}`,
            `--type=${order.type}`,
            `--token0_decimals=${order.pair.token0.decimals}`,
            `--token1_decimals=${order.pair.token1.decimals}`,
            `--trigger_action=${order.trigger.action}`,
            `--trigger_target=${order.trigger.target}`,
            `--pair_pool=${order.pair.pool}`,
        ]
        return execArgv
    }


    async killWatchers(pid) {
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



