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
        const signer = new ethers.Wallet.fromMnemonic(config.MNEMONIC)
        this.contract = contract.connect(signer)
        logger.info("Uniswap router is initialized")
    }

    async execute(order) {
        logger.info(`Executing order ${order.uuid}`)
        switch (order.execution.type) {
            case 'swapTokensForExactETH':
                return await this.swapTokensForExactETH(order.execution)
            case 'swapTokensForExactTokens':
                return await this.swapTokensForExactTokens(order.execution)
            case 'swapExactTokensForTokens':
                return await this.swapExactTokensForTokens(order.execution)
            case 'swapExactETHForTokens':
                return await this.swapExactETHForTokens(order.execution)
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