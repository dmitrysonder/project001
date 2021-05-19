const Uniswap= require("./Executors/Uniswap");
const {config} = require('../config');
const SushiSwap = require("./Executors/SushiSwap");
const { logger } = require('../utils/logger');

module.exports = class Executor {

    constructor(params) {
        logger.defaultMeta = {file: "Executor"}
        this.uniswap = new Uniswap(config.UNISWAP_ROUTER);
        this.sushiswap = new SushiSwap(config.SUSHI_ROUTER);
    }

    async execute(order) {
        switch(order.exchange) {
            case 'uniswap':
                return await this.uniswap.execute(order)
            case 'sushiswap':
                return await this.sushiswap.execute(order)
        }
    }
}