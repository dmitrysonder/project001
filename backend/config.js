exports.config = {
    ENV: "PROD",
    PORT: 3000,
    AWS_REGION: process.env.AWS_REGION || 'us-east-2', // AWS Region
    INFURA_KEY: process.env.INFURA_KEY || '694aa307fb484c5bac98e4dca4aca053', // Infura API key for eth testing
    TABLE_NAME: process.env.TABLE_NAME || 'holvis', // DynamoDB name
    BUCKET_NAME: process.env.BUCKET_NAME || 'project001',  // S3 bucket name  
    CHUNK_SIZE: process.env.CHUNK_SIZE || 10, // max simulateonos records in database
    ADDRESS: this.ENV === "PROD" ? "0.0.0.0" : "127.0.0.1",
    UNISWAP_ROUTER: process.env.UNISWAP || "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    getProvider: function () {
        return ["mainnet", { infura: this.INFURA_KEY }]
    }
}