const { getLogger } = require('../../utils/logger');
const Uniswap = require("./Uniswap")

module.exports = class Quickswap extends Uniswap {
    constructor() {
        super();
        this.logger = getLogger("Quickswap")
        this.PROVIDER = ethers.getDefaultProvider(...config.getProvider('polygon'))
        this.ROUTER_ADDRESS = addresses.QUICKSWAP_ROUTER
        this.FACTORY_ADDRESS = addresses.QUICKSWAP_FACTORY
        const contract = new ethers.Contract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.ROUTER_CONTRACT = contract.connect(this.ACCOUNT)
        this.logger.info("Quickswap router is initialized")
    }
}