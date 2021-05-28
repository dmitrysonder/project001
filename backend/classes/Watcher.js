const args = require('minimist')(process.argv.slice(2), { string: ['token1_address', 'pair_pool', 'token0_address'] });
const { getLogger } = require('../utils/logger');
const logger = getLogger("Watcher")
const utils = require('../utils/utils')
const {config} = require('../config')
const ethers = require('ethers')


class Watcher {
    constructor(params) {
        if (!params || !params.type || !params.uuid || !params.exchange) logger.error("No required params uuid and type", params)

        this.PAIR_ABI = config.getAbi("Pair.abi.json")
        this.provider = utils.getProviderForExchange(params.exchange)
        logger.debug(`Running watcher for: ${params.exchange}`)
        switch (params.type) {
            case "timestamp":
                this.runTimestampWatcher(params)
                break;
            case "listing":
                this.runListingWatcher(params)
                break;
            case "price":
                this.runPriceWatcher(params)
                break;
            case "frontRunning":
                this.runMempoolWatcher(params)
                break;
            case "bot":
                this.runBotPriceWatcher(params)
                break;
            default:
                logger.error(`Unexpected watcher type passed: ${params.type}`)
        }
    }

    runTimestampWatcher(params) {

    }

    runListingWatcher(params) {

    }

    runBotPriceWatcher(params) {
        const contract = new ethers.Contract(params.pair_pool, this.PAIR_ABI, this.provider)
        logger.info(`Listening price change events on pool contract: ${contract.address}`)


        contract.on("Sync", (reserve0, reserve1) => {
            const price = (reserve1 / reserve0) * Math.pow(10, params.token0_decimals - params.token1_decimals)
            logger.debug(`Price changed: ${price.toFixed(2)} for ${params.uuid}.\nTarget price for ${params.trigger_action} ${params.trigger_target}`)

            if (price <= params.trigger_priceToBuy) {
                process.send({
                    uuid: params.uuid,
                    data: {reserve0, reserve1, price},
                    msg: `Price for ${params.pair_name} is ${price} and it's below target ${params.trigger_priceToBuy}`
                })
            }
            
            if (price >= params.trigger_priceToSell) {
                process.send({
                    uuid: params.uuid,
                    data: {reserve0, reserve1, price},
                    msg: `Price for ${params.pair_name} is ${price} and it's above target ${params.trigger_priceToSell}`
                })
            }
        });
    }

    runPriceWatcher(params) {
        const contract = new ethers.Contract(params.pair_pool, this.PAIR_ABI, this.provider)
        logger.info(`Listening price change events on pool contract: ${contract.address}`)


        contract.on("Sync", (reserve0, reserve1) => {
            const price = (reserve1 / reserve0) * Math.pow(10, params.token0_decimals - params.token1_decimals)
            logger.debug(`Price changed: ${price.toFixed(2)} for ${params.uuid}.\nTarget price for ${params.trigger_action} ${params.trigger_target}`)

            if (price <= params.trigger_target && params.trigger_action === 'buy') {
                process.send({
                    uuid: params.uuid,
                    data: {reserve0, reserve1, price},
                    msg: `Price for ${params.pair_name} is ${price} and it's below target ${params.trigger_target}`
                })

            } else if (price >= params.trigger_target && params.trigger_action === 'sell') {
                process.send({
                    uuid: params.uuid,
                    data: {reserve0, reserve1, price},
                    msg: `Price for ${params.pair_name} is ${price} and it's above target ${params.trigger_target}`
                })
            }
        });
    }

    runMempoolWatcher(params) {

    }
}

const watcher = new Watcher(args)