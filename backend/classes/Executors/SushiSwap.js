const ethers = require('ethers')
const {config} = require('../../config')
const { logger } = require('../../utils/logger');

module.exports = class SushiSwap {

    constructor(address) {
        this.address = address
        this.ABI = config.getAbi("Router.abi.json")
        const provider = ethers.getDefaultProvider(...config.getProvider())
        this.contract = new ethers.Contract(this.address, this.ABI, provider)
        logger.info("Sushiswap router is initialized")
    }

    async swapTokensForExactETH(params) {
        const tx = await this.contract.swapTokensForExactETH(
            params.amountOut,
            params.amountInMax,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
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
        const tx = await this.contract.swapTokensForExactTokens(
            params.swapExactETHForTokens,
            params.amountOutMin,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
    }
}