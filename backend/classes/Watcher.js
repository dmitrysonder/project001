const args = require('minimist')(process.argv.slice(2), { string: ['token1_address', 'accountAddress', 'token0_address'] });
const { getLogger } = require('../utils/logger');
const logger = getLogger("Watcher")
const { config } = require('../config')
const ethers = require('ethers');
const db = require('../utils/db');
const utils = require('../utils/utils')
const { addresses } = require('../addresses')

class Watcher {
    constructor(params) {
        this.methods = [
            'swapExactETHForTokens',
            'swapETHForExactTokens',
            'swapExactETHForTokensSupportingFeeOnTransferTokens',
            'swapExactTokensForETH',
            'swapExactTokensForETHSupportingFeeOnTransferTokens',
            'swapExactTokensForTokens',
            'swapExactTokensForTokensSupportingFeeOnTransferTokens',
            'swapTokensForExactETH',
            'swapTokensForExactTokens'
        ]
        if (!params || !params.network || !params.accountAddress) logger.error("No required params network for Watcher. Passed params")

        this.PAIR_ABI = config.getAbi("Pair.abi.json")
        const providerData = config.getProvider(params.network)
        const provider = ethers.getDefaultProvider(...providerData)
        if (!provider) {
            logger.info(`Provider is not mounted`)
        }
        this.network = params.network
        this.provider = provider
        this.accountAddress = params.accountAddress
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



    async syncBalances() {
        const tokens = [...new Set(this.orders.map(order => [order.pair.token0.address, order.pair.token1.address]).flat())]
        const promises = []
        for (const token of tokens) {
            promises.push(this.getBalance(token))
        }
        const balances = await Promise.all(promises)
        this.balances = balances
    }

    async getBalance(tokenAddress) {
        const contract = new ethers.Contract(tokenAddress, config.getAbi('ERC20.abi.json'), this.provider)
        const balance = await contract.balanceOf(this.accountAddress) 
        return {
            tokenAddress,
            balance
        }
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
            this.syncBalances()
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
            logger.error('Error during initalizing listeners')
            logger.error(JSON.stringify(e))
        }
    }

    sendMessage(type, order, data) {
        process.send({
            type,
            order,
            data,
            msg: `${order.uuid} - ${type} start for ${order.pair.token0.symnol}-${order.pair.token1.symbol}`
        })
    }

    runMempoolListener(order) {
        const iface = new ethers.utils.Interface(config.getAbi('Router.abi.json'))
        const { volume0, volume1 } = order.trigger_
        const parsedVolume0 = ethers.utils.parseUnits(volume0, order.pair.token0.decimals)
        const parsedVolume1 = ethers.utils.parseUnits(volume1, order.pair.token1.decimals)
        const ROUTER_ADDRESS = addresses.getRouterByExchange(order.exchange)
        console.log(ROUTER_ADDRESS)
        this.provider.on('pending', async (data) => {
            console.log('new tx to:')
            console.log(data.to)
            this.sendMessage('frontRunning', order, { method: 'method', args, balances: this.balances })

            if (data.to === ROUTER_ADDRESS) {
                logger.debug(JSON.stringify(data))
                const tx = iface.parseTransaction(data.data)
                const args = tx.args
                logger.debug(JSON.stringify(args))
                if (args[3].includes(order.pair.token0.address) || args[3].includes(order.pair.token1.address)) {
                    if (args[0] > parsedVolume0 || args[1] > parsedVolume1) {
                        this.sendMessage('frontRunning', order, { method: 'method', args, balances: this.balances })
                    }
                }
            }
        })
    }

    async runTimestampListener(order) {
        const { target } = order.trigger_
        while (true) {
            await new Promise(resolve => setTimeout(resolve, config.TIMESTAMP_CHECK_RATE));
            if (+new Date() > target) {
                db.updateOrder(order.uuid_, { status_: "triggered" })
                this.sendMessage('timestamp', order)
            }
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
                //logger.debug(price)
                if (price <= target && action === 'buy') {
                    contract.removeAllListeners()
                    db.updateOrder(order.uuid_, { status_: "triggered" })
                    this.sendMessage('price', order, { reserve0, reserve1, price } )
                } else if (price >= target && action === 'sell') {
                    contract.removeAllListeners()
                    db.updateOrder(order.uuid_, { status_: "triggered" })
                    this.sendMessage('price', order, { reserve0, reserve1, price } )
                }
                counter++
                if (counter > config.PRICE_UPDATE_RATE) {
                    counter = 0
                    logger.debug(`${pairName} price ${price} is updated in DB`)
                    process.send({
                        type: 'info',
                        order: order,
                        price,
                        isInfo: true
                    })
                    await db.updateOrder(order.uuid_, { currentPrice: utils.toFixed(price) })
                }
            } catch (e) {
                logger.error('Somethig wrong with price listener')
                logger.error(JSON.stringify(e))
            }
        })
    }


}

const watcher = new Watcher(args)