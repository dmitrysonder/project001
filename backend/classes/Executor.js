
const Uniswap = require("./Exchanges/Uniswap");
const Sushiswap = require("./Exchanges/Sushiswap");
const Quickswap = require("./Exchanges/QuickSwap");
const Pancake = require("./Exchanges/Pancake");
const { getLogger } = require('../utils/logger');
const logger = getLogger("Executor")

module.exports = class Executor {

    constructor() {
        this.uniswap = new Uniswap();
        this.sushiswap = new Sushiswap();
        this.quickswap = new Quickswap();
        this.pancake = new Pancake();
    }

    async execute(order, data) {
        let method = order.trigger_.action === "buy" || data.trade === "buy"
            ? "swapTokensForExactTokens"
            : "swapExactTokensForTokens"

        switch (order.exchange) {
            case 'uniswap':
                return await this.uniswap.execute(method, order, data)
            case 'sushiswap':
                return await this.sushiswap.execute(method, order, data)
            case 'quickswap':
                return await this.quickswap.execute(method, order, data)
            case 'pancake':
                return await this.pancake.execute(method, order, data)
            default:
                logger.error(`Unexpected exchange ${order.exchange}`)
                return false
        }
    }
}