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

    setupAccount(account) {
        const account_ = account.connect(this.PROVIDER)
        this.ACCOUNT = account_
        this.ROUTER_CONTRACT = this.ROUTER_CONTRACT.connect(account_)
    }

    newContract(address, abi, provider) {
        const contract = new ethers.Contract(address, abi, provider)
        return contract
    }

    async recognizePool(token0, token1) {
        if (token0 && token1) {
            try {
                const factory = new ethers.Contract(this.FACTORY_ADDRESS, this.FACTORY_ABI, this.PROVIDER)
                const pair = await factory.getPair(ethers.utils.getAddress(token0), ethers.utils.getAddress(token1))
                return pair
            } catch(e) {
                return false
            }
        }
        return false
    }

    async recognizeToken(address_) {
        if (address_) {
            try {
                const address = ethers.utils.getAddress(address_)
                const token = new ethers.Contract(address, config.getAbi('ERC20.abi.json'), this.PROVIDER)
                const symbol = await token.symbol()
                const decimals = await token.decimals()
                return {
                    address,
                    decimals: decimals.toString(),
                    symbol
                }
            } catch(e) {
                return false
            }
        }
    }

    getTxParams(order) {
        return {
            amount: order.execution.denomination === 'base'
                ? ethers.utils.parseUnits(order.execution.amount, order.pair.token0.decimals)
                : ethers.utils.parseUnits(order.execution.amount, order.pair.token1.decimals),
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


    async doSandwitchTrade(order, data) {
        this.logger.info(`Starting Sandwitch Trade`)
        let whaleResult = 'pending';
        let botResult = 'pending';
        let newAmount;
        data.whaleTx.wait(1).then(async tx => {
            whaleResult = 'done'
            if (botResult === 'done' || botResult === 'pending') {
                const amountOut = await this.ROUTER_CONTRACT.getAmountOut(newAmount, reserve0, reserve1) // TODO: Replace with offile calculations
                const amountOutMin = amountOut.mul(10000 - slippage).div(10000)
                const newTx = this.swapExactTokensForTokens({
                    newAmount,
                    amountOutMin,
                    path,
                    to,
                    deadline,
                    overrides
                })
                return {
                    result: 'success',
                    tx: newTx
                }
            } else {
                return {
                    result: 'failed because first trade failed',
                }
            }
        }).catch(err => {
            whaleResult = 'fail'
            this.logger.warn('Whale transaction failed')
            return {
                result: 'whale transaction failed',
                err
            }
        })

        const { to } = this.getTxParams(order)
        const { reserve0, reserve1, method, args, amount } = data
        const overrides = this.getTxOverrides(order)
        const slippage = order.execution.maxSlippage * 100
        let tx

        switch (method) {
            case 'swapExactTokensForTokens':
                const amountIn = await this.ROUTER_CONTRACT.getAmountIn(amount, reserve1, reserve0) // TODO: Replace with offline calculations
                const amountInMax = amountIn.mul(10000 + slippage).div(10000)
                newAmount = amountIn
                tx = whaleResult === 'pending' && this.swapTokensForExactTokens({
                    amount,
                    amountInMax,
                    path: args[2],
                    to,
                    deadline: args[4]
                })
            case 'swapTokensForExactTokens':
                const amountOut = await this.ROUTER_CONTRACT.getAmountOut(amount, reserve0, reserve1) // TODO: Replace with offile calculations
                newAmount = amountOut
                const amountOutMin = amountOut.mul(10000 - slippage).div(10000)
                tx = whaleResult === 'pending' && this.swapExactTokensForTokens({
                    amount,
                    amountOutMin,
                    path,
                    to,
                    deadline,
                    overrides
                })
            default:
                this.logger.warn(`Unexpected method of whale tx: ${method}`)
        }

        tx.wait(1).then(data => botResult = 'done').catch(e => {
            botResult = 'fail'
            this.logger.error(`Swap failed with error: ${JSON.stringify(e)}`)
            return  {
                result: 'first transaction failed'
            }
        })
    }

    async getReserves(pairAddress) {
        const contract = new ethers.Contract(pairAddress, config.getAbi('Pair.abi.json'), this.PROVIDER)
        const [reserve0, reserve1] = await contract.getReserves()
        return {reserve0, reserve1}
    }

    async doTrade(order, data) {
        const { path, to, deadline, amount } = this.getTxParams(order)
        if (!data) {
            const reserves = await this.getReserves(order.pair)
            const {reserve0, reserve1} = reserves
        } else {
            const { reserve0, reserve1 } = data
        }
        const overrides = this.getTxOverrides(order)
        const slippage = order.execution.maxSlippage * 100
        let tx

        if (order.execution.denomination === 'base' && order.trigger_.action === 'buy' || order.execution.denomination === 'quote' && order.trigger_.action === 'buy') {
            const amountIn = await this.ROUTER_CONTRACT.getAmountIn(amount, reserve1, reserve0) // TODO: Replace with offline calculations
            const amountInMax = amountIn.mul(10000 + slippage).div(10000)
            tx = await this.swapTokensForExactTokens({
                amount,
                amountInMax,
                path,
                to,
                deadline
            })
        } else if ((order.execution.denomination === 'base' && order.trigger_.action === 'sell') || (order.execution.denomination === 'quote' && order.trigger_.action === 'buy')) {
            const amountOut = await this.ROUTER_CONTRACT.getAmountOut(amount, reserve0, reserve1) // TODO: Replace with offile calculations
            const amountOutMin = amountOut.mul(10000 - slippage).div(10000)
            tx = await this.swapExactTokensForTokens({
                amount,
                amountOutMin,
                path,
                to,
                deadline,
                overrides
            })
        } else {
            this.logger.warn(`Unexpected trade operation`)
        }

        await db.updateOrder(order.uuid_, { status_: 'pending', receipt: tx })
        this.eventEmitter.emit('ServerEvent', { type: 'status', value: 'pending', uuid: order.uuid_, tx })
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

    swapTokensForExactTokens(data) {
        const { path, to, deadline, amount, amountInMax } = data
        const overrides = this.getTxOverrides(order)
        const params = [
            amount,
            amountInMax,
            path,
            to,
            deadline,
            overrides
        ]
        this.logger.info(`swapTokensForExactTokens tx sended with params: ${params}`)
        return this.ROUTER_CONTRACT.swapTokensForExactTokens(...params);
    }

    swapExactTokensForTokens(data) {
        const { path, to, deadline, amount, amountOutMin } = data
        const overrides = this.getTxOverrides(order)
        const params = [
            amount,
            amountOutMin,
            path,
            to,
            deadline,
            overrides
        ]
        this.logger.info(`swapExactTokensForTokens tx sended with params: ${params}`)
        return this.ROUTER_CONTRACT.swapTokensForExactTokens(...params);
    }
}