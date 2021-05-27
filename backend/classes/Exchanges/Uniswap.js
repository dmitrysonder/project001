const ethers = require('ethers')
const { config } = require('../../config')
const utils = require("../../utils/utils")
const { addresses } = require('../../addresses')
const { getLogger } = require('../../utils/logger');

module.exports = class Uniswap {

    constructor() {
        this.logger = getLogger("Uniswap")
        this.PROVIDER = utils.getProviderForExchange('uniswap')
        this.ROUTER_ADDRESS = addresses.UNISWAP_ROUTER
        this.FACTORY_ADDRESS = addresses.UNISWAP_FACTORY

        this.ROUTER_ABI = config.getAbi("Router.abi.json")
        this.PAIR_ABI = config.getAbi("Pair.abi.json")
        this.FACTORY_ABI = config.getAbi("Factory.abi.json")
        this.ACCOUNT = new ethers.Wallet.fromMnemonic(config.MNEMONIC) // TODO: replace with secrets manager
        const contract = this.newContract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.ROUTER_CONTRACT = contract.connect(this.ACCOUNT)
        this.DEADLINE = +new Date() + 100000
        this.EXECUTION_GAS_LIMIT = 30000000

       this.logger.info("Uniswap router is initialized")
    }

    newContract(address, abi, provider) {
        return new ethers.Contract(address, abi, provider)
    }

    async recognizePool(token0, token1) {
        const factory = new Contract(this.FACTORY_ADDRESS, this.FACTORY_ABI, this.PROVIDER)
        const pair = await factory.getPair(token0, token1)
        return pair
    }

    async execute(method, order) {
        this.logger.info(`Executing by method ${method}`)
        const params = {
            to: this.ACCOUNT.address,
            deadline: this.DEADLINE,
            path: [order.token0.address, order.token1.address]
        }
        let amountOut
        let amount 
        switch (method) {

            case 'swapTokensForExactTokens':
                amountOut = await this.ROUTER_CONTRACT.getAmountIn(params.amountOut, params.reserveIn, params.reserveOut)
                amountInMax = amountIn * params.maxSlippage / 100
                return await utils.doTransaction(this.ROUTER_CONTRACT.swapTokensForExactTokens(
                    amountOut,
                    amountInMax,
                    params.path,
                    params.to,
                    params.deadline,
                    {
                        gasPrice: params.gasPrice,
                        gasLimit: this.EXECUTION_GAS_LIMIT
                    }
                ))
            case 'swapExactTokensForTokens':
                amountOut = await this.ROUTER_CONTRACT.getAmountIn(params.amountOut, params.reserveIn, params.reserveOut)
                amountInMax = amountIn * params.maxSlippage / 100
                return await utils.doTransaction(this.ROUTER_CONTRACT.swapTokensForExactTokens(
                    amountOut,
                    amountInMax,
                    params.path,
                    params.to,
                    params.deadline,
                    {
                        gasPrice: params.gasPrice,
                        gasLimit: this.EXECUTION_GAS_LIMIT
                    }
                ))
            default:
                this.logger.error(`Unexpected execution type in order ${order.uuid} : `)
                return false
        }
    }

}