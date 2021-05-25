const {Contract, getDefaultProvider} = require('ethers')
const {config} = require('../config')
const PROVIDER = getDefaultProvider(...config.getProvider())

module.exports = {

    recognizePool: async function (token0, token1) {
        const factory = new Contract(config.UNISWAP_FACTORY, config.getAbi("UniswapFactory.abi.json"), PROVIDER)
        const pair = await factory.getPair(token0.address, token1.address)
        console.log(pair)
        return pair
    },
    recognizeToken: async function (address) {
        const token = new Contract(address, config.getAbi('ERC20.abi.json'), PROVIDER)
        const decimals = await token.decimals()
        const symbol = await token.symbol()
        return {
            address,
            decimals,
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