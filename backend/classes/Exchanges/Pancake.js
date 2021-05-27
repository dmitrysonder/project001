const { getLogger } = require('../../utils/logger');
const Uniswap = require("./Uniswap")
const utils = require("../../utils/utils")
const { addresses } = require('../../addresses')

module.exports = class Pancake extends Uniswap {
    constructor() {
        super();
        this.logger = getLogger("Pancake")
        this.PROVIDER = utils.getProviderForExchange('pancake')
        this.ROUTER_ADDRESS = addresses.PANCAKE_ROUTER
        this.FACTORY_ADDRESS = addresses.PANCAKE_FACTORY
        const contract = this.newContract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.ROUTER_CONTRACT = contract.connect(this.ACCOUNT)
        this.logger.info("Pancake router is initialized")
    }
}