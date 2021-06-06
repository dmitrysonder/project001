const ethers = require('ethers')
const { config } = require('../../config')
const { addresses } = require('../../addresses')
const { getLogger } = require('../../utils/logger');
const db = require('../../utils/db');

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
        this.EXECUTION_GAS_LIMIT = BigInt(4600000)
    }

    async approve(order) {
        const token0 = order.pair.token0
        const token1 = order.pair.token1
        const contract0 = new ethers.Contract(token0.address, config.getAbi('ERC20.abi.json'), this.ACCOUNT)
        const contract1 = new ethers.Contract(token1.address, config.getAbi('ERC20.abi.json'), this.ACCOUNT)
        const [allowance0, allowance1] = await Promise.all([
            contract0.allowance(this.ACCOUNT.address, this.ROUTER_ADDRESS),
            contract1.allowance(this.ACCOUNT.address, this.ROUTER_ADDRESS)
        ])

        const overrides = this.getTxOverrides(order)
        if (allowance0 < config.MIN_ALLOWANCE) {
            this.logger.info(`Approving ${token0.symbol}`)
            const tx = await contract0.approve(this.ROUTER_ADDRESS, config.MAX_ALLOWANCE, overrides)
            console.log(`Approving ended with: ${JSON.stringify(tx)}`)
        } else {
            this.logger.info(`Approve is not needed for ${token0.symbol}`)
        }

        if (allowance1 < config.MIN_ALLOWANCE) {
            this.logger.info(`Approving ${token1.symbol}`)
            const tx = await contract1.approve(this.ROUTER_ADDRESS, config.MAX_ALLOWANCE, overrides)
            console.log(`Approving ended with: ${JSON.stringify(tx)}`)
        } else {
            this.logger.info(`Approve is not needed for ${token1.symbol}`)
        }
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
        const pair = await factory.getPair(ethers.utils.getAddress(token0), ethers.utils.getAddress(token1))
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

    getTxParams(order) {
        return {
            amount: ethers.utils.parseUnits(order.execution.amount, order.pair.token0.decimals),
            to: this.ACCOUNT.address,
            deadline: this.DEADLINE,
            path: order.trigger_.action === 'sell' ? [order.pair.token1.address, order.pair.token0.address] : [order.pair.token0.address, order.pair.token1.address]
        }
    }

    getTxOverrides(order) {
        return {
            gasPrice: ethers.utils.parseUnits(order.execution.gasPrice, 'gwei'),
            gasLimit: this.EXECUTION_GAS_LIMIT
        }
    }

    async execute(method, order, data) {
        switch (method) {
            case 'swapTokensForExactTokens':
                return await this.swapTokensForExactTokens(data, order)
            case 'swapExactTokensForTokens':
                return await this.swapExactTokensForTokens(data, order)
            default:
                this.logger.error(`Unexpected execution type in order ${order.uuid} : `)
                return false
        }
    }


    async swapTokensForExactTokens(data, order) {
        const { path, to, deadline, amount } = this.getTxParams(order)
        const { reserve0, reserve1 } = data
        const overrides = this.getTxOverrides(order)
        const slippage = order.execution.maxSlippage * 100
        const amountIn = await this.ROUTER_CONTRACT.getAmountIn(amount, reserve1, reserve0)
        const amountInMax = amountIn.mul(10000 + slippage).div(10000)

        this.logger.info(`swapTokensForExactTokens ${ethers.utils.formatUnits(amount, order.pair.token0.decimals)} ${order.pair.token0.symbol} using ${ethers.utils.formatUnits(amountInMax, order.pair.token1.decimals)} ${order.pair.token1.symbol}`)
        const tx = await this.ROUTER_CONTRACT.swapTokensForExactTokens(
            amount,
            amountInMax,
            path,
            to,
            deadline,
            overrides
        );

        await db.updateOrder(order.uuid_, { status_: 'pending', receipt: tx })
        this.eventEmitter.emit('ServerEvent', {type: 'status', value: 'pending', uuid: order.uuid_, tx})
        const result = {}
        await tx.wait(1).then(receipt => {
            result.status = "confirmed"
            result.receipt = receipt
        }).catch(err => {
            result.status = "failed"
            result.receipt = err
        })

        return result
    }

    async swapExactTokensForTokens(data, order) {
        const { path, to, deadline, amount } = this.getTxParams(order)
        const { reserve0, reserve1 } = data
        const overrides = this.getTxOverrides(order)
        const amountOut = await this.ROUTER_CONTRACT.getAmountOut(amount, reserve0, reserve1)
        const slippage = order.execution.maxSlippage * 100
        const amountOutMin = amountOut.mul(10000 - slippage).div(10000)

        this.logger.info(`swapExactTokensForTokens ${ethers.utils.formatEther(amount)} ${order.pair.token0.symbol} for ${ethers.utils.formatEther(amountOutMin)} ${order.pair.token1.symbol}`)

        const tx = await this.ROUTER_CONTRACT.swapExactTokensForTokens(
            amount,
            amountOutMin,
            path,
            to,
            deadline,
            overrides
        );

        const result = {}
        await tx.wait(1).then(receipt => {
            result.status = "confirmed"
            result.receipt = receipt
        }).catch(err => {
            result.status = "failed"
            result.receipt = err
        })

        return result
    }

}