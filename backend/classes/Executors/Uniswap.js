const ethers = require('ethers')
const {config} = require('../config')
const fs = require('fs')

export class Uniswap {

    constructor(address) {
        this.address = address
        this.ABI = config.getAbi("Router.abi.json")
        const provider = ethers.getDefaultProvider(...config.getProvider())
        this.contract = new ethers.Contract(this.address, this.ABI, provider)
    }

    swapTokensForExactETH(params) {
        const tx = await this.contract.swapTokensForExactETH(
            params.amountOut,
            params.amountInMax,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
    }

    swapTokensForExactTokens(params) {
        const tx = await this.contract.swapTokensForExactTokens(
            params.amountOut,
            params.amountInMax,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
    }

    swapExactTokensForTokens(params) {
        const tx = await this.contract.swapTokensForExactTokens(
            params.amountIn,
            params.amountOutMin,
            params.path,
            params.to,
            params.deadline,
        )
        return tx
    }

    swapExactETHForTokens(params) {
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