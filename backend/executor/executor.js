const ethers = require('ethers')
const {config} = require('../config')
const fs = require('fs')

const tradeEvent = {
    pool: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    amount0Out: 12, // uin256
    amount1Out: 10, // uint256
    to: "", // address
    data: "" // bytes
}

class Router {
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

const router = new Router(config.PANCAKE_ROUTER)
const WETH = async () => await router.contract.WETH()
WETH().then(d => console.log(d))