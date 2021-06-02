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
        // const eventFilter = {
        //     address: order.pair.pool,
        //     topics: [
        //         "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1"
        //     ]
        // }
        const contract = new ethers.Contract(order.pair.pool, this.PAIR_ABI, this.provider)
        contract.on('Sync', async (reserve0, reserve1) => {
            try {
                const token0 = order.pair.token0
                const token1 = order.pair.token1
                const pairName = `${token0.symbol}-${token1.symbol}`
                const target = order.trigger_.target
                const action = order.trigger_.action
                const price = (reserve1 / reserve0) * Math.pow(10, token0.decimals - token1.decimals)
                logger.debug(price)
                process.send({order})
                if (price <= target && action === 'buy') {
                    process.send({
                        order: order,
                        data: { reserve0, reserve1, price },
                        msg: `Price for ${pairName} is ${price} and it's below target ${target}`
                    })
                } else if (price >= target && action === 'sell') {
                    process.send({
                        order: order,
                        data: { reserve0, reserve1, price },
                        msg: `Price for ${pairName} is ${price} and it's above target ${target}`
                    })
                }
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