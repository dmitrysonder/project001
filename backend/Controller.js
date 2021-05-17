const ps = require('ps-node');
const db = require("./utils/db")
const { logger } = require('./utils/logger')
const { fork } = require('child_process');


class Controller {

    watchers = []
    orders = []

    constructor() {
        this.init()
    }

    async init() {
        await this.killWatchers()
        const orders = await this.getOrders()
        logger.info(`Loading watchers for ${orders.length} active orders from the database`)
        if (orders) {
            orders.forEach(order => this.createWatcher(order))
        }
        logger.info(`\n${this.watchers.map(watcher => `PID: ${watcher.worker.pid}, UUID: ${watcher.uuid}`).join("\n")}`)
        this.listen()
    }

    listen() {
        for (const watcher of this.watchers) {
            watcher.worker.on('message', message => {
                logger.info(`signal for execution from child ${watcher.worker.pid}: ${message}`);
            });
        }  
    }

    generateArgv(order, arr, prevKey_) {
        const execArgv = arr || []
        const prevKey = prevKey_ ? `${prevKey_}_` : '';
        Object.keys(order).forEach(key => {
            if (typeof order[key] === 'string') execArgv.push(`--${prevKey}${key}=${order[key]}`);
            if (typeof order[key] === 'object') {
                this.generateArgv(order[key], execArgv, key)
            }
        })
        return execArgv
    }

    createWatcher(order) {
        const execArgv = this.generateArgv(order)
        const options = {
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
        };
        const worker = fork("./watchers/Watcher.js", execArgv, options);
        this.watchers.push({
            uuid: order.uuid,
            worker,
        })
        this.orders.push(order)
    }

    async getOrders() {
        const data = await db.scan({
            FilterExpression: "pk = :pk and status_ = :status",
            ExpressionAttributeValues: {
                ":pk": 'order',
                ":status": 'active',
            }
        })
        if (data["Items"]?.length === 0) {
            logger.warn("No active orders found in database")
            return false
        }
        return data["Items"]
    }


    async killWatchers() {
        ps.lookup({
            command: 'node',
        }, function (err, resultList) {
            if (err) {
                throw new Error(err);
            }
            const watchers = resultList.filter(process => process?.arguments[0] === "Watcher.js")
            if (watchers.length === 0) return true

            logger.info("Killing all existing watchers")
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

const controller = new Controller()



