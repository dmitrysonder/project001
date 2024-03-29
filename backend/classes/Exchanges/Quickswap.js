const { getLogger } = require('../../utils/logger')
const Uniswap = require("./Uniswap")
const { addresses } = require('../../addresses')

module.exports = class Quickswap extends Uniswap {
    constructor(provider) {
        super();
        this.logger = getLogger("Quickswap")
        this.PROVIDER = provider
        this.ROUTER_ADDRESS = addresses.QUICKSWAP_ROUTER
        this.FACTORY_ADDRESS = addresses.QUICKSWAP_FACTORY
        const contract = this.newContract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.ROUTER_CONTRACT = contract.connect(this.ACCOUNT)
        this.logger.info("Quickswap router is initialized")
    }
}