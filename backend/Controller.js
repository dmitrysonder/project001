const ps = require('ps-node');
const db = require("./utils/db")
const { logger } = require('./utils/logger')
const { config } = require("./config")
const {fork} = require('child_process');  


class Controller {
    watchers = []
    constructor() {
        this.init()
    }

    async init() {
        await this.killWatchers()
        const orders = await this.getOrders()
        if (orders) {
            orders.forEach(order => this.createWatcher(order))
        }
    }

    createWatcher(order) {
        const execArgv = []
        Object.entries(order).forEach(entry => execArgv.push(`--${entry[0]}=${entry[1]}`))
        const worker_process = fork("Watcher.js", {execArgv}); 
        this.watchers.push({
            uuid: order.uuid,
            worker_process
        })
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
