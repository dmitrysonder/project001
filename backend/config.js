const {readFileSync} = require('fs');

exports.config = {
    ENV: "DEV",
    PORT: 3000,
    AWS_REGION: process.env.AWS_REGION || 'us-east-2', // AWS Region
    INFURA_KEY: process.env.INFURA_KEY || '694aa307fb484c5bac98e4dca4aca053', // Infura API key for eth testing
    TABLE_NAME: process.env.TABLE_NAME || 'project01', // DynamoDB name
    BUCKET_NAME: process.env.BUCKET_NAME || 'project01',  // S3 bucket name  
    CHUNK_SIZE: process.env.CHUNK_SIZE || 10, // max simulateonos records in database
    ADDRESS: this.ENV === "PROD" ? "0.0.0.0" : "127.0.0.1",
    UNISWAP_ROUTER: process.env.UNISWAP_ROUTER || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    SUSHI_ROUTER: process.env.SUSHI_ROUTER || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    PANCAKE_ROUTER: process.env.PANCAKE_ROUTER || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    MNEMONIC: "organ phone easy person rent soap garbage safe finish arena liberty ring",
    
    getProvider: function () {
        return ["mainnet", { infura: this.INFURA_KEY }]
    },
    getAbi: function(fileName) {
        return JSON.parse((readFileSync(__dirname + '/abis/' + fileName).toString()))
    }
}