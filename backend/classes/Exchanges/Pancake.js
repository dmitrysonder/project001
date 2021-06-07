const { getLogger } = require('../../utils/logger');
const Uniswap = require("./Uniswap")
const { addresses } = require('../../addresses')

module.exports = class Pancake extends Uniswap {
    constructor(provider) {
        super();
        this.logger = getLogger("Pancake")
        this.PROVIDER = provider
        this.ROUTER_ADDRESS = addresses.PANCAKE_ROUTER
        this.FACTORY_ADDRESS = addresses.PANCAKE_FACTORY
        this.ROUTER_CONTRACT = this.newContract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.logger.info("Pancake router is initialized")
    }
}