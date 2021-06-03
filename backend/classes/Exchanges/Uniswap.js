const ethers = require('ethers')
const { config } = require('../../config')
const { addresses } = require('../../addresses')
const { getLogger } = require('../../utils/logger');
  

module.exports = class Uniswap {

    constructor(provider) {
        this.logger = getLogger("Uniswap")
        this.PROVIDER = provider
        this.ROUTER_ADDRESS = addresses.UNISWAP_ROUTER
        this.FACTORY_ADDRESS = addresses.UNISWAP_FACTORY

        this.ROUTER_ABI = config.getAbi("Router.abi.json")
        this.PAIR_ABI = config.getAbi("Pair.abi.json")
        this.FACTORY_ABI = config.getAbi("Factory.abi.json")
        this.ROUTER_CONTRACT = this.newContract(this.ROUTER_ADDRESS, this.ROUTER_ABI, this.PROVIDER)
        this.DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20
        this.EXECUTION_GAS_LIMIT = 4000000
    }


    setupAccount(seedString) {
        const account = new ethers.Wallet.fromMnemonic(seedString).connect(this.PROVIDER)
        this.ACCOUNT = account
        this.ROUTER_CONTRACT = this.ROUTER_CONTRACT.connect(account)
    }

    newContract(address, abi, provider) {
        const contract = new ethers.Contract(address, abi, provider)
        return contract
    }

    async recognizePool(token0, token1) {
        const factory = new ethers.Contract(this.FACTORY_ADDRESS, this.FACTORY_ABI, this.PROVIDER)
        const pair = await factory.getPair(token0, token1)
        return pair
    }

    async recognizeToken(address_) {
        const address = ethers.utils.getAddress(address_)
        const token = new ethers.Contract(address, config.getAbi('ERC20.abi.json'), this.PROVIDER)
        const symbol = await token.symbol()
        const decimals = await token.decimals()
        return {
            address,
            decimals: decimals.toString(),
            symbol
        }
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