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
        this.DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20
        this.EXECUTION_GAS_LIMIT = 4000000
    }

    newContract(address, abi, provider) {
        const contract = new ethers.Contract(address, abi, this.ACCOUNT.connect(provider))
        return contract
    }

    async recognizePool(token0, token1) {
        const factory = new Contract(this.FACTORY_ADDRESS, this.FACTORY_ABI, this.PROVIDER)
        const pair = await factory.getPair(token0, token1)
        return pair
    }

    async execute(method, order, data) {
        const params = {
            to: this.ACCOUNT.address,
            deadline: this.DEADLINE,
            path: [order.pair.token0.address,order.pair.token1.address],
        }

        const overrides = {
            gasPrice: ethers.utils.parseUnits(order.execution.gasPrice, 'gwei'),
            gasLimit: BigInt(this.EXECUTION_GAS_LIMIT)
        }
        const amount = ethers.utils.parseUnits(order.execution.amount, order.pair.token0.decimals)
        let amountOut, amountInMax, tx, result
        switch (method) {

            case 'swapTokensForExactTokens':
                this.logger.info(`Executing by method ${method}`)
                amountOut = await this.ROUTER_CONTRACT.getAmountIn(amount, data.reserve0, data.reserve1)
                amountInMax = amountIn * params.maxSlippage / 100
                tx = await this.ROUTER_CONTRACT.swapExactTokensForTokens(
                    amount,
                    amountOutMin,
                    params.path,
                    params.to,
                    params.deadline,
                    overrides
                );
                result = await tx.wait(1).then(data => true).catch(err => false)
                return result
            case 'swapExactTokensForTokens':
                this.logger.info(`Executing by method ${method}`)
                amountOut = await this.ROUTER_CONTRACT.getAmountOut(amount, data.reserve0, data.reserve1)
                const slippage = order.execution.maxSlippage * 100
                const amountOutMin = amountOut.mul(10000 - slippage).div(10000)
                tx = await this.ROUTER_CONTRACT.swapExactTokensForTokens(
                    amount,
                    amountOutMin,
                    params.path,
                    params.to,
                    params.deadline,
                    overrides
                );
                result = await tx.wait(1).then(data => true).catch(err => false)
                return result
            default:
                this.logger.error(`Unexpected execution type in order ${order.uuid} : `)
                return false
        }
    }

}