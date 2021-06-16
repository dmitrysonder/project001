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
            this.frontRunOrders = orders.filter(order => order.type_ === 'frontRunning').map(ord => {
                ord['router'] = addresses.getRouterByExchange(ord.exchange)
                const {volume0, volume1} = ord.trigger_
                const parsedVolume0 = ethers.utils.parseUnits(volume0, ord.pair.token0.decimals)
                const parsedVolume1 = ethers.utils.parseUnits(volume1, ord.pair.token1.decimals)
                ord.trigger_['parsedVolume0'] = parsedVolume0
                ord.trigger_['parsedVolume1'] = parsedVolume1
                return ord
            })
            if (this.frontRunOrders.length > 0) {
                logger.debug(`Initializing ${this.frontRunOrders.length} frontRun orders`)
                this.runMempoolListener()
            }
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
                }
            }
        } catch (e) {
            logger.error('Error during initalizing listeners')
            console.log(e)
        }
    }

    sendMessage(type, order, data) {
        process.send({
            type,
            order,
            data,
            msg: `${order.uuid_} - ${type} start for ${order.pair.token0.symbol}-${order.pair.token1.symbol}`
        })
    }

    runMempoolListener() {
        const iface = new ethers.utils.Interface(config.getAbi('Router.abi.json'))
        this.provider.on('pending', async (data) => {
            console.log('new tx')
            const filteredByRouter = this.frontRunOrders.filter(order => order.router === data.to)
            if (filteredByRouter.length > 0) {
                logger.debug(`Tx to Router found`)
                const tx = iface.parseTransaction(data.data)
                const args = tx.args
                logger.debug(JSON.stringify(args))
                const filteredByPair = filteredByRouter.filter(order => args[3].includes(order.pair.token0.address) || args[3].includes(order.pair.token1.address))
                const filteredByVolume = filteredByPair.filter(order => {
                    const {parsedVolume0, parsedVolume1} = order.trigger_
                    return args[0] > parsedVolume0 || args[1] > parsedVolume1
                })
                if (filteredByVolume.length > 0) {
                    logger.debug(`FrontRun is triggered`)
                    this.sendMessage('frontRunning', filteredByVolume[0], { method: 'method', args, balances: this.balances, whaleTx: this.provider.getTransaction(data.transactionHash) })
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

    runListingListener(order) {
        const FACTORY_ADDRESS = addresses.getFactoryByExchange(order.exchange)
        const contract = new ethers.Contract(FACTORY_ADDRESS, config.getAbi('Factory.abi.json'), this.provider)
        const {token0} = order.pair
        contract.on('PairCreated', async (token0_, token1_, pair, poolId) => {
            try {
                if (token0.address === token0_) {
                    this.sendMessage('updatePair', order)
                    contract.removeAllListeners()
                    this.runLiquidityListener(order, pair)
                }
            } catch(e) {
                logger.error(`Something goes wrong in lising listener: ${JSON.stringify(e)}`)
            }
        })
    }

    runLiquidityListener(order, pair) {
        const contract = new ethers.Contract(pair, config.getAbi('Router.abi.json'), this.provider)
        const amount = ethers.utils.parseUnits(order.execution.amount, order.pair.token0.decimals)
        contract.on('Mint', async(sender, amount0, amount1) => {
            if (amount0 > amount) {
                await db.updateOrder(order.uuid_, { status_: "triggered" })
                contract.removeAllListeners()
                order.pool = pair
                this.sendMessage('listing', order)
            }
        })
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
                console.log(e)
            }
        })
    }


}

const watcher = new Watcher(args)