const args = require('minimist')(process.argv.slice(2), {string: ['token1_address', 'pair_pool', 'token0_address']});
const { logger } = require('../utils/logger')
const { ethers } = require('ethers')
const fs = require('fs')
const { config } = require('../config')


class Watcher {

    constructor(params) {
        logger.defaultMeta = {file: "Watcher"}
        if (!params || !params.uuid) return logger.error("Wrong params passed", params)

        this.ABI = config.getAbi("Pair.abi.json")
        this.provider = ethers.getDefaultProvider(...config.getProvider())

        logger.info(`Running a "${params?.type}" Watcher for order ${params?.uuid}`)
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
        const contract = new ethers.Contract(params.pair_pool, this.ABI, this.provider)
        logger.debug(`Listening price change events on pool contract: ${contract.address}`)

        contract.on("Sync", (reserve0, reserve1) => {
            const price = (reserve1 / reserve0) * Math.pow(10, 12)
            logger.debug(`Price changed: ${price.toFixed(2)} for ${params.uuid}`)
            process.send(params);
        });
    }

    runMempoolWatcher(params) {
        
    }
}

const watcher = new Watcher(args)