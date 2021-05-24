const {Contract} = require('ethers')
const {config} = require('../config')

module.exports = {

    recognizePool: function (token0, token1) {
        return "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852"
    },
    recognizeToken: async function (address, provider) {
        const token = new Contract(address, config.getAbi('ERC20.abi.json'), config.getProvider())
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