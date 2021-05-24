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
          <th scope="row">
            {{ `${order.pair.token0.symbol}-${order.pair.token1.symbol}` }}
          </th>
          <td>{{ order.status_ }}</td>
          <td>{{ order.trigger.action }}</td>
          <td>{{ order.execution.amount }}</td>
          <td>
            {{
              `${order.trigger.action} when ${order.type} hit ${order.trigger.target}`
            }}
          </td>
          <td><b>2845.32</b></td>
          <td>
            <button
              v-if="order.status_ === 'paused'"
              v-on:click="resumeOrder(order.uuid)"
              type="button"
              class="btn btn-outline-warning btn-sm"
            >
              Resume
            </button>
            <button 
            v-on:click="pauseOrder(order.uuid)"
            v-else type="button" class="btn btn-outline-success btn-sm">
              Pause
            </button>

            <button v-on:click="deleteOrder(order.uuid)" type="button" class="btn btn-outline-danger btn-sm">
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import axios from "axios";
import { config } from "../../config";

export default {
  name: "Orders",
  data() {
    return {
      orders: null,
    };
  },
  created: function () {
    axios.get(`${config.rest}/orders`).then((res) => {
      console.log(res);
      this.orders = res.data?.orders;
    });
  },
  methods: {
    resumeOrder(uuid) {
      axios({
        method: "POST",
        url: `${config.rest}/update`,
        params: {uuid}, 
        data: {
          status_: "active",
        },
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid === uuid);
        this.orders[index].status_ = "active";
      });
    },
    pauseOrder(uuid) {
      axios({
        method: "POST",
        url: `${config.rest}/update`,
        params: {uuid}, 
        data: {
          status_: "paused",
        },
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid === uuid);
        this.orders[index].status_ = "paused";
      });
    },
    deleteOrder(uuid) {
      axios({
        method: "POST",
        url: `${config.rest}/delete`,
        params: {uuid}
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid === uuid);
        this.orders.splice(index)
      });
    }
  },
};
</script>

<style>
h3 {
  margin-bottom: 5%;
}
</style>