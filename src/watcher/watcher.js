const ethers = require('ethers')
const {config} = require('../utils/config')
const provider = ethers.getDefaultProvider(...config.getProvider())

const topicSets = [
    ethers.utils.id("Swap(address,uint256,uint256,uint256,uint256,address)"),
    null,
    [
        "0xc60c479f3cc66f1654a4113f4949c98ce77a9995"
    ]
]
provider.on("block", (log, event) => {
    console.log(event)
    console.log(log)
    // Emitted any token is sent TO either address
})
