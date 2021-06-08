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
                logger.debug("Updating all listeners")
                this.updateListeners()
            }
        })
    }


    updateListeners() {
        this.provider.removeAllListeners()
        this.runListeners()
    }

    async runListeners() {
        try {
            const allOrders = await db.getOrders('active')
            logger.debug(`Active orders:\n${allOrders.map(order => order.uuid_).join("\n")}`)
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
                        this.runTimestampListener(order)
                        logger.info(`[${this.network}] Timestamp listener is created for order: ${order.uuid_}`)
                        break;
                    case 'listing':
                        this.runListingListener(order)
                        logger.info(`[${this.network}] Listing listener is created for order: ${order.uuid_}`)
                        break;
                    case 'frontRunning':
                        this.runMempoolListener(order)
                        logger.info(`[${this.network}] Mempool listener is created for order: ${order.uuid_}`)
                        break;
                }
            }
        } catch (e) {
            logger.error(JSON.stringify(e))
        }
    }

    runMempoolListener(order) {
        
    }

    runTimestampListener(order) {
        const {target, action} = order.trigger_
        (async function doSomeStuff() {
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 60000));
                if (+new Date() > target) {
                    db.updateOrder(order.uuid_, {status_: "triggered"})
                    process.send({
                        type: 'timestamp',
                        order: order,
                        msg: `${order.uuid} - Timestamp order is triggered for ${order.pair.token0.symnol}-${order.pair.token1.symbol}`
                    })
                }
            }
        })();
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
                logger.debug(price)
                if (price <= target && action === 'buy') {
                    contract.removeAllListeners()
                    db.updateOrder(order.uuid_, {status_: "triggered"})
                    process.send({
                        type: 'price',
                        order: order,
                        data: { reserve0, reserve1, price },
                        msg: `${order.uuid} - Price for ${pairName} is ${price} and it's below target ${target}`
                    })
                    
                } else if (price >= target && action === 'sell') {
                    contract.removeAllListeners()
                    db.updateOrder(order.uuid_, {status_: "triggered"})
                    process.send({
                        type: 'price',
                        order: order,
                        data: { reserve0, reserve1, price },
                        msg: `Price for ${pairName} is ${price} and it's above target ${target}`
                    })
                }
                
                if (counter > config.PRICE_UPDATE_RATE) {
                    counter = 0
                    logger.debug(`${pairName} price ${price} is updated in DB`)
                    process.send({
                        type: 'info',
                        order: order,
                        price,
                        isInfo: true
                    })
                    await db.updateOrder(order.uuid_, {currentPrice: utils.toFixed(price)})
                }
                counter ++
            } catch (e) {
                logger.error(JSON.stringify(e))
            }
        })
    }


}

const watcher = new Watcher(args)