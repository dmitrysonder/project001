const { Uniswap } = require("./Executors/uniswap");
const {config} = require('../config');
const { SushiSwap } = require("./Executors/SushiSwap");
const { PancakeSwap } = require("./Executors/PancakeSwap");
const { logger } = require('../utils/logger')

class Executor {

    constructor() {
        logger.defaultMeta = {file: "Executor"}
        this.uniswap = new Uniswap(config.UNISWAP_ROUTER);
        this.sushiswap = new SushiSwap(config.SUSHI_ROUTER);
        this.pancakeswap = new PancakeSwap(config.PANCAKE_ROUTER);
    }

}