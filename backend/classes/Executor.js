const Uniswap= require("./Executors/Uniswap");
const {config} = require('../config');
const SushiSwap = require("./Executors/SushiSwap");
const { getLogger } = require('../utils/logger');
const logger = getLogger("Executor")

module.exports = class Executor {

    constructor(params) {
        logger.defaultMeta = {file: "Executor"}
        this.uniswap = new Uniswap(config.UNISWAP_ROUTER);
        this.sushiswap = new SushiSwap(config.SUSHI_ROUTER);
    }

    async execute(order, trade) {
        
        switch(order?.exchange) {
            case 'uniswap':
                return await this.uniswap.execute(order, trade)
            case 'sushiswap':
                return await this.sushiswap.execute(order, trade)
            default:
                logger.error(`Unexpected exchange ${order.exchange}`)
                return false
        }
    }
}