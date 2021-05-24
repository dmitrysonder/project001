module.exports.constants = {
    types: {
        price: "Limit Order",
        timestamp: "Timestamp Order",
        listing: "Listing Order",
        frontRunning: "Front-Running",
        bot: "Bot"
    },
    generalFields: {
        token0: { type: "search", label: "Base Token Address", placeholder: "0x..."},
        token1: { type: "search", label: "Quote Token Address", placeholder: "0x..."},
        amount: {type: "text", label: "Amount (Base Token)"},
        gasPrice: {type: "number", label: "Gas Price"},
        maxSlippage: {type: "text", label: "Max Slippage"}
    },
    
    limitOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
        price: {label: "Target Price", type: "text"}
    },
    timestampOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
        date: {label: "Date", type: "date"},
        time: {label: "Time", type: "time"}
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