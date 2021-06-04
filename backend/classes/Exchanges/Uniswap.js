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
        this.EXECUTION_GAS_LIMIT = BigInt(4000000)
    }

    async approve(order) {
        const token = order.trigger_.action === 'sell' ? order.pair.token0 : order.pair.token1
        const contract = new ethers.Contract(token.address, config.getAbi('ERC20.abi.json'), this.ACCOUNT)
        const allowance = await contract.allowance(this.ACCOUNT.address, this.ROUTER_ADDRESS)
        console.log(this.ACCOUNT.address)
        console.log(this.ROUTER_ADDRESS)
        console.log(allowance)
        const amountBn = ethers.utils.parseUnits(order.execution.amount, token.decimals)
        const diff = amountBn.sub(allowance)
        // if (diff > 0) {
            const overrides = this.getTxOverrides(order)
            this.logger.info(`Approving ${diff} ${token.symbol}`)
            const tx = contract.approve(this.ROUTER_ADDRESS, allowance, overrides)
            console.log(`Approving ended with: ${tx.code}`)
            return tx
        // } else {
        //     this.logger.info(`Approve is not needed for ${token.symbol}. Diff: ${diff}`)
        // }
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
            path: [order.pair.token0.address, order.pair.token1.address],
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
        const {path, to, deadline, amount} = this.getTxParams(order)
        const {reserve0, reserve1} = data
        const overrides = this.getTxOverrides(order)
        const slippage = order.execution.maxSlippage * 100
        const amountIn = await this.ROUTER_CONTRACT.getAmountIn(amount, reserve0, reserve1)
        const amountInMax = amountIn.mul(10000 + slippage).div(10000)

        this.logger.info(`Buying ${ethers.utils.formatEther(amount)} ${order.pair.token0.symbol} using ${ethers.utils.formatEther(amountInMax)} ${order.pair.token1.symbol}`)

        const tx = await this.ROUTER_CONTRACT.swapTokensForExactTokens(
            amount,
            amountInMax,
            path,
            to,
            deadline,
            overrides
        );
        
        await db.updateOrder(order.uuid_, {status_: 'pending', receipt: tx})
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
        const {path, to, deadline, amount}  = this.getTxParams(order)
        const {reserve0, reserve1} = data
        const overrides = this.getTxOverrides(order)
        const amountOut = await this.ROUTER_CONTRACT.getAmountOut(amount, reserve0, reserve1)
        const slippage = order.execution.maxSlippage * 100
        const amountOutMin = amountOut.mul(10000 - slippage).div(10000)

        this.logger.info(`Selling ${ethers.utils.formatEther(amount)} ${order.pair.token0.symbol} for ${ethers.utils.formatEther(amountOutMin)} ${order.pair.token1.symbol}`)

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