const ethers = require('ethers')
const { config } = require('../../config')
const { getLogger } = require('../../utils/logger');
const logger = getLogger("Uniswap")

module.exports = class Uniswap {

    constructor(address) {
        this.address = address
        this.ABI = config.getAbi("Router.abi.json")
        const provider = ethers.getDefaultProvider(...config.getProvider())
        const contract = new ethers.Contract(this.address, this.ABI, provider)
        const account = new ethers.Wallet.fromMnemonic(config.MNEMONIC)
        this.account = account
        this.contract = contract.connect(account)
        this.deadline = +new Date() + 100000
        logger.info("Uniswap router is initialized")
    }

    async execute(method, params) {
        logger.info(`Executing by method ${method}`)
        params.to = this.account.address
        params.deadline = this.deadline

        switch (method) {
            case 'swapTokensForExactETH':

                return await this.swapTokensForExactETH(params)
            case 'swapTokensForExactTokens':
                const amountIn = await this.contract.getAmountIn(params.amountOut, params.reserveIn, params.reserveOut)
                const amountInMax = amountIn * params.maxSlippage / 100
                return await this.swapTokensForExactTokens(params)
            case 'swapExactTokensForTokens':
                return await this.swapExactTokensForTokens(params)
            case 'swapExactETHForTokens':
                return await this.swapExactETHForTokens(params)
            default:
                logger.error(`Unexpected execution type in order ${order.uuid} : `)
                return false
        }
    }


    async swapTokensForExactETH(params) {
        try {
            const tx = await this.contract.swapTokensForExactETH(
                params.amountOut,
                params.amountInMax,
                params.path,
                params.to,
                params.deadline,
            )
            return tx
        } catch (e) {
            logger.error(e)
            return e
        }
    }

    async swapTokensForExactTokens(params) {
        const tx = await this.contract.swapTokensForExactTokens(
            params.amountOut,
            params.amountInMax,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
    }

    async swapExactTokensForTokens(params) {
        const tx = await this.contract.swapTokensForExactTokens(
            params.amountIn,
            params.amountOutMin,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
    }

    async swapExactETHForTokens(params) {
        try { // TODO params decomposition
            const tx = await this.contract.swapTokensForExactTokens(
                params.swapExactETHForTokens,
                params.amountOutMin,
                params.path,
                params.to,
                params.deadline,
            )
            return tx
        } catch (e) {
            logger.error(e)
            return e
        }
    }
}