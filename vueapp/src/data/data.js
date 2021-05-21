module.exports.constants = {
    types: [
        "Limit Order",
        "Timestamp Order",
        "Listing Order",
        "Front-Running",
        "Bot"
    ],
    generalFields: {
        token0: { type: "search", label: "Base Token", placeholder: "ETH or 0x..."},
        token1: { type: "search", label: "Quote Token", placeholder: "ETH or 0x..."},
        amount0: {type: "text", label: "Amount (Base Token)"},
        gasPrice: {type: "number", label: "Gas Price"},
        maxSlippage: {type: "text", label: "Max Slippage"}
    },
    
    limitOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["limit buy", "limit sell"]},
        price: {label: "Target Price", type: "text"}
    },
    timestampOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
        timestamp: {label: "Date & Time", type: "date"}
    },
    listingOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
    },
    frontRun: {
        volume0: {label: "Min Volume (Base Token)", type: "text"},
        volume1: {label: "Min Volume (Quote Token)", type: "text"},
    },
    bot: {
        priceToBuy: {label: "Price when Buy", type: "text"},
        priceToSell: {label: "Price when Sell", type: "text"}
    }
}