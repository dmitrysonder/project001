const { Contract, getDefaultProvider, ethers } = require('ethers')
const { config } = require('../config')

module.exports = {

    doTransaction: async function (operation) {
        try {
            operation()
        } catch (e) {
            return e
        }
    },

    getNetworkByExchange(exchange) {
        switch (exchange) {
            case 'uniswap':
                return 'eth'
            case 'sushiswap':
                return 'eth'
            case 'quickswap':
                return 'polygon'
            case 'pancake':
                return 'bsc'
            default:
                return 'eth'
        }
    },

    getProviderForExchange(exchange) {
        return getDefaultProvider(...config.getProvider(this.getNetworkByExchange(exchange)))
    },

    recognizeToken: async function (address, exchange) {
        const token = new Contract(address, config.getAbi('ERC20.abi.json'), this.getProviderForExchange(exchange))
        const decimals = await token.decimals()
        const symbol = await token.symbol()
        return {
            address,
            decimals: decimals.toString(),
            symbol
        }
    },

    recognizeTrigger: function (body) {
        switch (body.orderType) {
            case 'price':
                return {
                    action: body.trade,
                    target: body.price
                }
            case 'timestamp':
                return {
                    action: body.trade,
                    target: +new Date(`${body.date}T${body.time}`)
                }
            case 'listing':
                return {
                    action: body.trade
                }
            case 'frontRunning':
                return {
                    volume0: body.volume0,
                    volume1: body.volume1
                }
            case 'bot':
                return {
                    priceToBuy: body.priceToBuy,
                    priceToSell: body.priceToSell
                }
        }
    }
}