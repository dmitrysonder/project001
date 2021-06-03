const args = require('minimist')(process.argv.slice(2), { string: ['token1_address', 'pair_pool', 'token0_address'] });
const { getLogger } = require('../utils/logger');
const logger = getLogger("Watcher")
const { config } = require('../config')
const ethers = require('ethers');
const db = require('../utils/db');
const utils = require('../utils/utils')

class Watcher {
    constructor(params) {
        if (!params || !params.network) logger.error("No required params network for Watcher. Passed params")
        this.PAIR_ABI = config.getAbi("Pair.abi.json")
        const providerData = config.getProvider(params.network)
        const provider = ethers.getDefaultProvider(...providerData)
        if (!provider) {
            logger.info(`Provider is not mounted`)
        }
        this.network = params.network
        this.provider = provider
        logger.debug(`Running watcher with provider for ${this.network}`)
        this.runListeners()
        this.listen()
    }

    listen() {
        process.on('message', (data) => {
            if (data.msg = "update") {
                logger.debug("updating all listeners")
                this.updateListeners()
            }
        })
    }

    async runListeners() {
        try {
            const allOrders = await db.getOrders('active')
            const orders = allOrders.filter(order => {
                const network = utils.getNetworkByExchange(order.exchange)
                return this.network === network
            })
            this.orders = orders
            for (const order of this.orders) {
                switch (order.type_) {
                    case 'price':
                        this.runPriceListener(order)
                        logger.info(`[${this.network}] Price listener is created for order: ${order.uuid_}`)
                        break;
                    case 'timestamp':
                    case 'listing':
                    case 'frontRunning':
                    case 'bot':
                }
            }
        } catch (e) {
            logger.error(JSON.stringify(e))
        }
    }

    runPriceListener(order) {
        const contract = new ethers.Contract(order.pair.pool, this.PAIR_ABI, this.provider)
        let counter = 0
        contract.on('Sync', async (reserve0, reserve1) => {
            try {
                const token0 = order.pair.token0
                const token1 = order.pair.token1
                const pairName = `${token0.symbol}-${token1.symbol}`
                const target = order.trigger_.target
                const action = order.trigger_.action
                const price = (reserve1 / reserve0) * Math.pow(10, token0.decimals - token1.decimals)

                if (price <= target && action === 'buy') {
                    process.send({
                        order: order,
                        data: { reserve0, reserve1, price },
                        msg: `Price for ${pairName} is ${price} and it's below target ${target}`
                    })
                    contract.removeAllListeners()
                } else if (price >= target && action === 'sell') {
                    process.send({
                        order: order,
                        data: { reserve0, reserve1, price },
                        msg: `Price for ${pairName} is ${price} and it's above target ${target}`
                    })
                    contract.removeAllListeners()
                }
                
                if (counter > config.PRICE_UPDATE_RATE) {
                    logger.debug(`${pairName} price ${price} is updated in DB`)
                    await db.updateOrder(order.uuid_, {currentPrice: utils.toFixed(price)})
                    counter = 0
                }
                counter ++
            } catch (e) {
                logger.error(JSON.stringify(e))
            }
        })
    }

    updateListeners() {
        this.provider.removeAllListeners()
        this.runListeners()
    }

}

const watcher = new Watcher(args)