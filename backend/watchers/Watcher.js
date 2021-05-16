const args = require('minimist')(process.argv.slice(2), {string: ['a', 'pool']});
const { logger } = require('../utils/logger')
const { ethers } = require('ethers')
const fs = require('fs')
const { config } = require('../config')


class Watcher {

    constructor(params) {
        logger.defaultMeta = {file: "Watcher"}
        if (!params || !params.type || !params.uuid) return logger.error("No required params uuid and type", params)

        this.ABI = JSON.parse((fs.readFileSync(`../abis/Pair.abi.json`).toString()))
        this.provider = ethers.getDefaultProvider(...config.getProvider())

        logger.info(`Running a "${params.type}" Watcher for order ${params.uuid}`)
        switch (params?.type) {
            case "timestamp":
                this.runTimestampWatcher(params)
                break;
            case "listing":
                this.runListingWatcher(params)
                break;
            case "price":
                this.runPriceWatcher(params)
                break;
            case "mempool":
                this.runMempoolWatcher(params)
                break;
            default:
                logger.error(`Unexpected watcher type passed: ${params.type}`)
        }
    }

    runTimestampWatcher(params) {

    }

    runListingWatcher(params) {

    }

    runPriceWatcher(params) {
        const contract = new ethers.Contract(params.pool, this.ABI, this.provider)
        logger.info(`Listening price change events on pool contract: ${contract.address}`)

        contract.on("Sync", (reserve0, reserve1) => {
            const price = (reserve1 / reserve0) * Math.pow(10, 12)
            logger.info(price.toFixed(2))
        });
    }

    runMempoolWatcher(params) {
        
    }
}


const watcher = new Watcher(args)