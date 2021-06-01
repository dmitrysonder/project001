const args = require('minimist')(process.argv.slice(2), { string: ['token1_address', 'pair_pool', 'token0_address'] });
const { getLogger } = require('../utils/logger');
const logger = getLogger("NewWatcher")
const utils = require('../utils/utils')
const { config } = require('../config')
const ethers = require('ethers');
const db = require('../utils/db');

class NewWatcher {
    constructor(params) {
        if (!params || params.network) logger.error("No required params exchange for Watcher. Passed params " + JSON.stringify(params))
        this.PAIR_ABI = config.getAbi("Pair.abi.json")
        const providerData = config.getProvider(params.network)
        this.provider = ethers.getDefaultProvider(...providerData)
        logger.debug(`Running watcher with provider for ${this.provider.network}`)
    }


    async runListeners() {
        const orders = await db.getOrders('active')
        this.orders = orders
        for (const order of this.orders) {
            switch (order.type_) {
                case 'price':
                    this.runPriceListener(order)
                    logger.info(`Price listener is created for order: ${order.uuid_}`)
                    break;
                case 'timestamp':
                case 'listing':
                case 'frontRunning':
                case 'bot':
            }
        }
    }

    runPriceListener(order) {
        const eventFilter = {
            address: order.pair.pool,
            topics: [

            ]
        }
        this.provider.once(eventFilter, async (reserve0, reserve1) => {
            const token0 = order.pair.token0
            const token1 = order.pair.token1
            const pairName = `${token0.symbol}-${token1.symbol}`
            const target = order.trigger_.target
            const action = order.trigger_.action
            const price = (reserve1 / reserve0) * Math.pow(10, token0.decimals - token1.decimals)
            if (price <= target && action === 'buy') {
                process.send({
                    uuid: order.uuid_,
                    data: { reserve0, reserve1, price },
                    msg: `Price for ${pairName} is ${price} and it's below target ${target}`
                })
            } else if (price >= target && action === 'sell') {
                process.send({
                    uuid: order.uuid_,
                    data: { reserve0, reserve1, price },
                    msg: `Price for ${pairName} is ${price} and it's above target ${target}`
                })
            }
        })
    }

    updateListeners() {
        this.provider.removeAllListeners()
        this.runListeners()
    }

}

const watcher = new NewWatcher(args)