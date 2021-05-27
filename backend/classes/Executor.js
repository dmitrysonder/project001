
const Uniswap = require("./Exchanges/Uniswap");
const Sushiswap = require("./Exchanges/Sushiswap");
const Quickswap = require("./Exchanges/QuickSwap");
const { getLogger } = require('../utils/logger');
const logger = getLogger("Executor")

module.exports = class Executor {

    constructor() {
        this.uniswap = new Uniswap();
        this.sushiswap = new Sushiswap();
        this.quickswap = new Quickswap();
    }

    async execute(order, data) {
        let method = order.trigger.action === "buy" || data.trade === "buy"
            ? "swapTokensForExactTokens"
            : "swapExactTokensForTokens"

        switch (order.exchange) {
            case 'uniswap':
                return await this.uniswap.execute(method, order)
            case 'sushiswap':
                return await this.sushiswap.execute(method, order)
            case 'quickswap':
                return await this.quickswap.execute(method, order)
            default:
                logger.error(`Unexpected exchange ${order.exchange}`)
                return false
        }
    }
}