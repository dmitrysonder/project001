<template>
  <div class="container">
    <h3>Orders:</h3>
    <table class="table">
      <thead>
        <tr>
          <th scope="col">Id</th>
          <th scope="col">Status</th>
          <th scope="col">Type</th>
          <th scope="col">Amount</th>
          <th scope="col">Pair</th>
          <th scope="col">Trigger</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" v-bind:key="order.sk">
          <th scope="row">{{ order.sk }}</th>
          <td>{{ order.status }}</td>
          <td>{{ order.type }}</td>
          <td>{{ order.amount }}</td>
          <td>{{ order.pair }}</td>
          <td>{{ order.trigger }}</td>
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
    axios.get("http://127.0.0.1:3000/orders").then((res) => {
      console.log(res);
      this.orders = res.data.orders;
    })
  },
};
</script>

<style>
h3 {
  margin-bottom: 5%;
}
</style>