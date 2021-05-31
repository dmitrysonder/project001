const { config } = require("./config")
const { IS_TESTNET } = config

exports.addresses = {
    UNISWAP_ROUTER: IS_TESTNET
        ? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        : "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    UNISWAP_FACTORY: IS_TESTNET
        ? "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f"
        : "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
    PANCAKE_ROUTER: IS_TESTNET
        ? "0x10ed43c718714eb63d5aa57b78b54704e256024e"
        : "0x05ff2b0db69458a0750badebc4f9e13add608c7f",
    PANCAKE_FACTORY: IS_TESTNET
        ? "0x10ed43c718714eb63d5aa57b78b54704e256024e"
        : "0xBCfCcbde45cE874adCB698cC183deBcF17952812",
    QUICKSWAP_ROUTER: IS_TESTNET
        ? "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
        : "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    SUSHI_ROUTER: IS_TESTNET
        ? "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
        : "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
}