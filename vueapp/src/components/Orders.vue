<template>
  <div class="container">
    <h4>Orders:</h4>
    <table class="table">
      <thead>
        <tr>
          <th scope="col">Pair</th>
          <th scope="col">Status</th>
          <th scope="col">Buy/Sell</th>
          <th scope="col">Amount</th>
          <th scope="col">Trigger</th>
          <th scope="col">Current</th>
          <th scope="col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" v-bind:key="order.uuid">
          <th scope="row">{{ `${order.pair.token0.symbol}-${order.pair.token1.symbol}` }}</th>
          <td>{{ order.status_ }}</td>
          <td>{{ order.trigger.action }}</td>
          <td>{{ order.execution.amount }}</td>
          <td>{{ `${order.trigger.action} when ${order.type} hit ${order.trigger.target}` }}</td>
          <td><b>2845.32</b></td>
          <td>
            <button v-if="order.status_ === 'paused' ">Resume</button>
            <button v-else>Pause</button>
            
            <button>Delete</button>
            </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import axios from "axios";
export default {
  name: "Orders",
  data() {
    return {
      orders: null,
    };
  },
  created: function () {
    axios.get("http://localhost:3000/orders").then((res) => {
      console.log(res)
      this.orders = res.data?.orders;
    })
  },
};
</script>

<style>
h3 {
  margin-bottom: 5%;
}
</style>