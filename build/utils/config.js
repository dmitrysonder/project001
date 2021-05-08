"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    PORT: 3000,
    AWS_REGION: process.env.AWS_REGION || 'us-east-2',
    INFURA_KEY: process.env.INFURA_KEY,
    TABLE_NAME: process.env.TABLE_NAME || 'project001',
    BUCKET_NAME: process.env.BUCKET_NAME || 'project001',
    CHUNK_SIZE: process.env.CHUNK_SIZE || 10,
    getProvider: function () {
        return ["mainnet", { infura: this.INFURA_KEY }];
    }
};
//# sourceMappingURL=config.js.map