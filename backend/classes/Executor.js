
const Uniswap = require("./Exchanges/Uniswap");
const Sushiswap = require("./Exchanges/Sushiswap");
const Quickswap = require("./Exchanges/Quickswap");
const Pancake = require("./Exchanges/Pancake");
const { getLogger } = require('../utils/logger');
const { config } = require('../config')
const logger = getLogger("Executor")
const { getDefaultProvider } = require('ethers')

module.exports = class Executor {

    constructor() {
        const ethProvider = getDefaultProvider(...config.getProvider('eth'))
        const bscProvider = getDefaultProvider(...config.getProvider('bsc'))
        const polygonProvider = getDefaultProvider(...config.getProvider('polygon'))
        this.ethProvider = ethProvider;
        this.bscProvider = bscProvider;
        this.polygonProvider = polygonProvider;
        this.uniswap = new Uniswap(ethProvider);
        this.sushiswap = new Sushiswap(ethProvider);
        this.quickswap = new Quickswap(polygonProvider);
        this.pancake = new Pancake(bscProvider);
    }

    async init(account) {
        this.uniswap.setupAccount(account)
        this.sushiswap.setupAccount(account)
        this.quickswap.setupAccount(account)
        this.pancake.setupAccount(account)
    }

    execute(order, data) {
        switch (order.exchange) {
            case 'uniswap':
                return order.type_ === 'frontRunning' ? this.uniswap.doSandwitchTrade(order, data) : this.uniswap.doTrade(order, data)
            case 'sushiswap':
                return this.sushiswap.doTrade(order, data)
            case 'quickswap':
                return this.quickswap.doTrade(order, data)
            case 'pancake':
                return this.pancake.doTrade(order, data)
            default:
                logger.error(`Unexpected exchange ${order.exchange}`)
                return false
        }
    }

    approve(order) {
        return this.getExecutorForExchange(order.exchange).approve(order)
    }

    getProviderForExchange(exchange) {
        switch (exchange) {
            case 'uniswap':
                return this.ethProvider
            case 'pancake':
                return this.bscProvider
            case 'sushiswap':
                return this.ethProvider
            case 'quickswap':
                return this.polygonProvider
            default:
                return this.bscProvider
        }
    }

    getExecutorForExchange(exchange) {
        switch (exchange) {
            case 'uniswap':
                return this.uniswap
            case 'pancake':
                return this.pancake
            case 'sushiswap':
                return this.sushiswap
            case 'quickswap':
                return this.quickswap
            default:
                return this.pancake
        }
    }

    // async recognizeToken(address_, exchange) {
    //     const address = utils.getAddress(address_)
    //     const token = new Contract(address, config.getAbi('ERC20.abi.json'), this.getProviderForExchange(exchange))
    //     const symbol = await token.symbol()
    //     const decimals = await token.decimals()
    //     return {
    //         address,
    //         decimals: decimals.toString(),
    //         symbol
    //     }
    // }
}