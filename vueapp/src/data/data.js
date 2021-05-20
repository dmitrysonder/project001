module.exports.constants = {
    types: [
        "Limit Order",
        "Timestamp Order",
        "Listing Order",
        "Front-Running",
        "Bot"
    ],
    generalFields: {
        token0: { type: "search", label: "Base Token"},
        token1: { type: "search", label: "Quote Token"},
        gasPrice: {type: "input", label: "Gas Price"},
        maxSlippage: {type: "input", label: "Max Slippage"},
        amount0: {type: "input", label: "Amount of Base Token to"},
        amount1: {type: "input", label: "Amount of Quote Token to"},
    },
    
    limitOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["limit buy", "limit sell"]},
        price: {label: "Target Price", type: "input"}
    },
    timestampOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
        timestamp: {label: "Date & Time", type: "date"}
    },
    listingOrder: {
        trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
        timestamp: {label: "Date & Time", type: "date"}
    },
    frontRun: {
        volume0: {label: "Min Volume in Base Token", type: "input"},
        volume1: {label: "Min Volume in Quote Token", type: "input"},
        sandwitchTrade: {label: "Sandwitch Trade", type: "checkbox"}
    },
    bot: {
        priceToBuy: {label: "Price when Buy", type: "input"},
        priceToSell: {label: "Price when Sell", type: "input"}
    }
}