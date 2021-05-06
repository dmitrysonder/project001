module.exports = {
    AWS_REGION: process.env.AWS_REGION || 'us-east-2', // AWS Region
    INFURA_KEY: process.env.INFURA_KEY, // Infura API key for eth testing
    TABLE_NAME: process.env.TABLE_NAME || 'project001', // DynamoDB name
    BUCKET_NAME: process.env.BUCKET_NAME || 'project001',  // S3 bucket name  
    CHUNK_SIZE: process.env.CHUNK_SIZE || 10, // max simulateonos records in database

    getProvider: function () {
        return ["mainnet", {infura: this.INFURA_KEY}]
    }
}