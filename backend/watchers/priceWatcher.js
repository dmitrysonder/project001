const ethers = require('ethers')
const fs = require('fs')
const {config} = require('../config')
const provider = ethers.getDefaultProvider(...config.getProvider())

const contractAddress = "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852"
const ABI = JSON.parse((fs.readFileSync(`../abis/Pair.abi.json`).toString()))
const Contract = new ethers.Contract(contractAddress,ABI,provider)
console.log(`Swap Contract is loaded at ${Contract.address}`)

Contract.on("Sync", (reserve0, reserve1, ...args) => {
    console.log(args[0].transactionIndex)
    const price = (reserve1/reserve0) * Math.pow(10, 12)
    console.log(price.toFixed(2))
});