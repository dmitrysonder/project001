const Uniswap = require("./Executors/Uniswap");
const { config } = require('../config');
const SushiSwap = require("./Executors/SushiSwap");
const { getLogger } = require('../utils/logger');
const logger = getLogger("Executor")
const {parseUnits} = require('ethers')

module.exports = class Executor {

    constructor(params) {
        logger.defaultMeta = { file: "Executor" }
        this.uniswap = new Uniswap(config.UNISWAP_ROUTER);
        this.sushiswap = new SushiSwap(config.SUSHI_ROUTER);
    }

    async execute(order, data) {

        switch (order.exchange) {
            case 'uniswap':
                let method
                const params = {}
                if (order.trigger.action === "buy" || data.trade === "buy") {
                    method = "swapTokensForExactTokens" // if buy we are buying exact amount
                    params.amountOut = parseUnits(order.execution.amount, order.pair.token0.decimals)
                    params.maxSlippage = order.execution.maxSlippage 
                    params.path = [order.pair.token0.address, order.pair.token1.address]
                } else {
                    method = "swapExactTokensForTokens" // if sell we are selling exact amount
                    params = {

                    }
                }

                return await this.uniswap.execute(method, params)
            case 'sushiswap':
                return await this.sushiswap.execute(order, params)
            case 'quickswap':
                return await this.sushiswap.execute(order, params)
            default:
                logger.error(`Unexpected exchange ${order.exchange}`)
                return false
        }
    }
}