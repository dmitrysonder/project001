const ethers = require('ethers')
const {config} = require('../config')
const fs = require('fs')

class Uniswap {
    constructor(address) {
        this.address = address
        this.ABI = JSON.parse((fs.readFileSync(`../abis/Router.abi.json`).toString()))
        this.init()
    }

    init() {
        const provider = ethers.getDefaultProvider(...config.getProvider())
        this.contract = new ethers.Contract(this.address, this.ABI, provider)
    }

    swapTokensForExactETH(params) {
        await this.contract.swapTokensForExactETH(
            params.amountOut,
            params.amountInMax,
            params.path,
            params.to,
            params.deadline,
        )
    }

    swapTokensForExactTokens(params) {

    }

    swapExactTokensForTokens(params) {

    }

    swapExactETHForTokens(params) {

    }
}

export const uniswap = new Uniswap(config.PANCAKE_ROUTER)