const { getLogger } = require('../../utils/logger');
const Uniswap = require("./Uniswap")

module.exports = class Sushiswap extends Uniswap {
    constructor() {
        super();
        this.logger = getLogger("Sushiswap")
        this.PROVIDER = ethers.getDefaultProvider(...config.getProvider('eth'))
        this.ROUTER_ADDRESS = addresses.SUSHI_ROUTER
        this.FACTORY_ADDRESS = addresses.SUSHI_FACTORY
        const contract = new ethers.Contract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.ROUTER_CONTRACT = contract.connect(this.ACCOUNT)
        this.logger.info("Sushiswap router is initialized")
    }
}