const args = require('minimist')(process.argv.slice(2), { string: ['token1_address', 'pair_pool', 'token0_address'] });
const { getLogger } = require('../utils/logger');
const logger = getLogger("Watcher")
const { ethers } = require('ethers')
const fs = require('fs')
const { config } = require('../config');
const db = require('../utils/db');
const {UniswapWatcher} = require("./Watchers/UniswapWatcher")


class Watcher {

    constructor(params) {
        logger.info(`Running a "${params.exchange}" watcher for order ${params.uuid}`)

        switch (params.exchange) {
            case "uniswap":
                this.watcher = new UniswapWatcher(params)
                break;
            case "quickswap":
                this.watcher = new QuickswapWatcher(params)
                break;
            case "sushiswap":
                this.watcher = new ShushiswapWatcher(params)
                break;
            default:
                logger.error(`Unexpected exchange passed: ${params.exchange}`)
        }
    }

    runTimestampWatcher(params) {

    }

    runListingWatcher(params) {

    }

    runBotPriceWatcher(params) {
        const contract = new ethers.Contract(params.pair_pool, this.ABI, this.provider)
        logger.debug(`Listening price change events on pool contract: ${contract.address}`)

        contract.on("Sync", (reserve0, reserve1) => {
            const price = (reserve1 / reserve0) * Math.pow(10, params.token0_decimals - params.token1_decimals)
            logger.debug(`Price changed: ${price.toFixed(2)} for ${params.uuid}.\nTarget price for ${params.trigger_action} ${params.trigger_target}`)

            if (price <= params.trigger_priceToBuy) {
                process.send({
                    uuid: params.uuid,
                    data: price,
                    msg: `Price for ${params.pair_name} is ${price} and it's below target ${params.trigger_priceToBuy}`
                })
            }
            
            if (price >= params.trigger_priceToSell) {
                process.send({
                    uuid: params.uuid,
                    data: price,
                    msg: `Price for ${params.pair_name} is ${price} and it's above target ${params.trigger_priceToSell}`
                })
            }
        });
    }

    runPriceWatcher(params) {
        const contract = new ethers.Contract(params.pair_pool, this.ABI, this.provider)
        logger.debug(`Listening price change events on pool contract: ${contract.address}`)

        contract.on("Sync", (reserve0, reserve1) => {
            const price = (reserve1 / reserve0) * Math.pow(10, params.token0_decimals - params.token1_decimals)
            logger.debug(`Price changed: ${price.toFixed(2)} for ${params.uuid}.\nTarget price for ${params.trigger_action} ${params.trigger_target}`)

            if (price <= params.trigger_target && params.trigger_action === 'buy') {
                process.send({
                    uuid: params.uuid,
                    data: price,
                    msg: `Price for ${params.pair_name} is ${price} and it's below target ${params.trigger_target}`
                })

            } else if (price >= params.trigger_target && params.trigger_action === 'sell') {
                process.send({
                    uuid: params.uuid,
                    data: price,
                    msg: `Price for ${params.pair_name} is ${price} and it's above target ${params.trigger_target}`
                })
            }
        });
    }

    runMempoolWatcher(params) {

    }
}

const watcher = new Watcher(args)