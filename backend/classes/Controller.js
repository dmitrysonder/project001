const ps = require('ps-node');
const db = require("../utils/db")
const { logger } = require('../utils/logger')
const { fork } = require('child_process');
const fs = require('fs')
const path = require('path');
const  Executor  = require('./Executor');

class Controller {

    watchers = []

    constructor() {
        this.init()
    }

    async init() {
        logger.defaultMeta = {file: "Controller"}
        this.executor = new Executor()

        await this.killWatchers()
        const orders = await db.getOrders()
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
                console.log(data)
                const tx = await this.executor.execute(data)
                console.log("tx", tx)
            });
        }
    }

    createWatcher(order) {
        const execArgv = this.generateArgv(order)
        const options = {
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
        };
        const pathToWatcher = path.resolve("Watcher.js")
        if (!fs.existsSync(pathToWatcher)) logger.error(`Path to watcher is not found` , pathToWatcher)
        
        const worker = fork(pathToWatcher, execArgv, options);
        this.watchers.push({
            order,
            worker,
        })
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


    async killWatchers() {
        ps.lookup({
            command: 'node',
        }, function (err, resultList) {
            if (err) {
                throw new Error(err);
            }
            const watchers = resultList.filter(process => process?.arguments[0] === "Watcher.js")
            if (watchers.length === 0) return true

            logger.info("Killing all existing watchers...")
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



