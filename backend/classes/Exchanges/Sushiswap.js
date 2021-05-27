const { getLogger } = require('../../utils/logger');
const Uniswap = require("./Uniswap")
const utils = require("../../utils/utils")
const { addresses } = require('../../addresses')

module.exports = class Sushiswap extends Uniswap {
    constructor() {
        super();
        this.logger = getLogger("Sushiswap")
        this.PROVIDER = utils.getProviderForExchange('sushiswap')
        this.ROUTER_ADDRESS = addresses.SUSHI_ROUTER
        this.FACTORY_ADDRESS = addresses.SUSHI_FACTORY
        const contract = this.newContract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.ROUTER_CONTRACT = contract.connect(this.ACCOUNT)
        this.logger.info("Sushiswap router is initialized")
    }
}