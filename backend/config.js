const { readFileSync } = require('fs');

const IS_TESTNET = process.env.IS_TESTNET || false
const ENV = "DEV"

exports.config = {
    IS_TESTNET: IS_TESTNET,
    ENV: ENV,
    PORT: 3000,
    AWS_REGION: process.env.AWS_REGION || 'us-east-2', // AWS Region
    INFURA_KEY: process.env.INFURA_KEY || '694aa307fb484c5bac98e4dca4aca053', // Infura API key for eth testing
    TABLE_NAME: IS_TESTNET ? 'project01-testnet' : 'project001', // DynamoDB name
    CHUNK_SIZE: process.env.CHUNK_SIZE || 10, // max simulateonos records in database
    ADDRESS: ENV === "PROD" ? "0.0.0.0" : "127.0.0.1",
    UNISWAP_ROUTER: process.env.UNISWAP_ROUTER || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    UNISWAP_FACTORY: process.env.UNISWAP_FACTORY || "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
    SUSHI_ROUTER: process.env.SUSHI_ROUTER || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    PANCAKE_ROUTER: process.env.PANCAKE_ROUTER || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    BOT_MNEMONIC_KEY: "botMnemonic",
    FRONTRUN_MNEMONIC_KEY: "frontMnemonic",
    PRICE_UPDATE_RATE: 3,
    MAX_ALLOWANCE: "50000000000000000000000000000000000000000000000000000000000000000000",
    MIN_ALLOWANCE: "5000000000000000000000000000000000",

    getProvider: function (network) {
        switch (network) {
            case 'eth':
                return this.IS_TESTNET
                ? ["ropsten", { infura: this.INFURA_KEY }]
                : ["mainnet", { infura: this.INFURA_KEY }]
            case 'bsc':
                return this.IS_TESTNET
                ? ["https://data-seed-prebsc-1-s1.binance.org:8545/"] 
                : ["https://bsc-dataseed.binance.org/"]
            case 'polygon':
                return this.IS_TESTNET
                ? [`https://polygon-mumbai.infura.io/v3/${this.INFURA_KEY}`]
                : [`https://polygon-mainnet.infura.io/v3/${this.INFURA_KEY}`]
        }
    },

    getAbi: function (fileName) {
        return JSON.parse((readFileSync(__dirname + '/abis/' + fileName).toString()))
    }
}