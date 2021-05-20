<template>
  <div class="container">
    <h4>Create Order</h4>
    <label>Type</label>
    <select>
      <option @change="onChange($event.target.value)" v-for="type in types" v-bind:key="type" v-bind:value="type">
        {{ type }}
      </option>
    </select>
    
    <div class="box">
      <div id="createOrder">
          
      </div>
    </div>
  </div>
</template>

<script>
function onChange(val) {
    console.log(val)
}
const types = [
  "Limit Order",
  "Timestamp Order",
  "Listing Order",
  "Front-Running",
  "Bot",
];

const generalFields = {
    token0: { type: "search", label: "Base Token"},
    token1: { type: "search", label: "Quote Token"},
    gasPrice: {type: "input", label: "Gas Price"},
    maxSlippage: {type: "input", label: "Max Slippage"},
    amount0: {type: "input", label: "Amount of Base Token to"},
    amount1: {type: "input", label: "Amount of Quote Token to"},
}

const limitOrder = {
    ...generalFields,
    trade: {label: "Buy/Sell", type: "dropdown", options: ["limit buy", "limit sell"]},
    price: {label: "Target Price", type: "input"}
}

const timestampOrder = {
    ...generalFields,
    trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
    timestamp: {label: "Date & Time", type: "date"}
}

const listingOrder = {
    ...generalFields,
    trade: {label: "Buy/Sell", type: "dropdown", options: ["buy", "sell"]},
    timestamp: {label: "Date & Time", type: "date"}
}

const frontRun = {
    ...generalFields,
    volume0: {label: "Min Volume in Base Token", type: "input"},
    volume1: {label: "Min Volume in Quote Token", type: "input"},
    sandwitchTrade: {label: "Sandwitch Trade", type: "checkbox"}
}

const bot = {
    ...generalFields,
    priceToBuy: {label: "Price when Buy", type: "input"},
    priceToSell: {label: "Price when Sell", type: "input"}
}

export default {
  name: "Create",
  data() {
    return { types , limitOrder, bot, frontRun, timestampOrder, listingOrder};
  }
};
</script>

<style>
h3 {
  margin-bottom: 5%;
}
#id {
  align-self: left;
}
.box {
  display: flex;
}
input {
  margin: 5px;
}
label {
    margin-right: 10px;
}
</style>