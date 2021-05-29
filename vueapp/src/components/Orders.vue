<template>
  <div class="container">
    <div class="create" style="max-width: 1300px">
      <h4>Create Order</h4>

      <div class="box">
        <div id="createOrder">
          <div class="container">
            <div class="form-group">
              <label for="exampleFormControlSelect1">Type</label>
              <select
                name="orderType"
                @change="onTypeChange($event)"
                class="form-control"
              >
                <option
                  v-for="type in Object.keys(types)"
                  v-bind:key="type"
                  v-bind:value="type"
                >
                  {{ types[type] }}
                </option>
              </select>
            </div>
            <div class="row justify-content-around">
              <div class="col-6 col-md-600px">
                <form>
                  <div
                    class="form-group"
                    v-for="name in Object.keys(generalFields)"
                    v-bind:key="name"
                  >
                    <label v-bind:for="name">{{
                      generalFields[name]["label"]
                    }}</label>

                    <select
                      v-if="generalFields[name].type === 'dropdown'"
                      v-bind:name="name"
                      class="form-control"
                    >
                      <option
                        v-for="option in generalFields[name].options"
                        v-bind:key="option"
                        v-bind:value="option"
                      >
                        {{ option }}
                      </option>
                    </select>
                    <input
                      v-else
                      class="form-control"
                      v-bind:name="name"
                      v-bind:type="generalFields[name].type"
                      v-bind:placeholder="generalFields[name].placeholder"
                    />
                  </div>
                </form>
              </div>

              <div class="col-6 md-500px" style="padding-left: 150px">
                <form>
                  <div
                    class="form-group"
                    v-for="name in Object.keys(fields)"
                    v-bind:key="name"
                  >
                    <label
                      v-bind:class="fields[name].labelClass"
                      v-bind:for="name"
                      >{{ fields[name]["label"] }}</label
                    >
                    <select
                      v-if="fields[name].type === 'dropdown'"
                      v-bind:name="name"
                      class="form-control"
                    >
                      <option
                        v-for="option in fields[name].options"
                        v-bind:key="option"
                        v-bind:value="option"
                      >
                        {{ option }}
                      </option>
                    </select>
                    <input
                      v-else
                      class="form-control"
                      v-bind:name="name"
                      v-bind:type="fields[name].type"
                    />
                  </div>
                  <button
                    v-on:click="createOrder"
                    type="submit"
                    class="btn btn-success"
                  >
                    Create
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <h4>Orders:</h4>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Exchange</th>
            <th scope="col">Pair</th>
            <th scope="col">Status</th>
            <th scope="col">Buy/Sell</th>
            <th scope="col">Amount</th>
            <th scope="col">Trigger</th>
            <th scope="col">Current</th>
            <th scope="col" style="width: 22%"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" v-bind:key="order.uuid_">
            <td>{{ order.exchange }}</td>
            <th scope="row">
              <a
                target="_blank" v-bind:href="getLink(order.exchange) + 'address/' + order.pair.pool"
              >
                {{ `${order.pair.token0.symbol}-${order.pair.token1.symbol}` }}
              </a>
            </th>
            <td>{{ order.status_ }}</td>
            <td>{{ order.trigger_.action }}</td>
            <td>{{ order.execution.amount }}</td>
            <td>
              {{
                `${order.trigger_.action} when ${order.type_} hit ${order.trigger_.target}`
              }}
            </td>
            <td>
              <b>{{ order.currentPrice }}</b>
            </td>
            <td>
              <button
                v-on:click="onEditOrder(order)"
                type="button"
                class="btn btn-outline-warning btn-sm"
              >
                Edit
              </button>
              <button
                v-if="order.status_ === 'paused'"
                v-on:click="resumeOrder(order.uuid_)"
                type="button"
                class="btn btn-outline-warning btn-sm"
              >
                Resume
              </button>
              <button
                v-on:click="pauseOrder(order.uuid_)"
                v-else
                type="button"
                class="btn btn-outline-success btn-sm"
              >
                Pause
              </button>

              <button
                v-on:click="deleteOrder(order.uuid_)"
                type="button"
                class="btn btn-outline-danger btn-sm"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { config } from "../../config";
import { constants } from "../data/data";

export default {
  name: "Orders",
  data() {
    return {
      orders: null,
      generalFields: constants.generalFields,
      types: constants.types,
      fields: {},
    };
  },
  created: function () {
    axios.get(`${config.rest}/orders`).then((res) => {
      console.log(res);
      this.orders = res.data?.orders;
    });
  },
  mounted() {
    this.fields = constants.limitOrder;
  },
  methods: {
    resumeOrder(uuid) {
      axios({
        method: "POST",
        url: `${config.rest}/update`,
        params: { uuid },
        data: {
          status_: "active",
        },
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid_ === uuid);
        this.orders[index].status_ = "active";
      });
    },
    onEditOrder(order) {
      
      console.log(order);
    },
    pauseOrder(uuid) {
      axios({
        method: "POST",
        url: `${config.rest}/update`,
        params: { uuid },
        data: {
          status_: "paused",
        },
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid_ === uuid);
        this.orders[index].status_ = "paused";
      });
    },
    deleteOrder(uuid) {
      axios({
        method: "POST",
        url: `${config.rest}/delete`,
        params: { uuid },
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid_ === uuid);
        this.orders.splice(index, 1);
      });
    },
    createOrder(event) {
      event.preventDefault();
      const data = {};
      document
        .querySelectorAll("input")
        .forEach((el) => (data[el.name] = el.value));
      document
        .querySelectorAll("select")
        .forEach((el) => (data[el.name] = el.value));
      axios({
        method: "POST",
        url: `${config.rest}/new`,
        data,
      }).then((response) => {
        console.log(response);
      });
    },
    onTypeChange(event) {
      switch (event.target.value) {
        case "price":
          this.fields = constants.limitOrder;
          break;
        case "timestamp":
          this.fields = constants.timestampOrder;
          break;
        case "listing":
          this.fields = constants.listingOrder;
          break;
        case "frontRunning":
          this.fields = constants.frontRun;
          break;
        case "bot":
          this.fields = constants.bot;
          break;
      }
    },
    getLink(exchange) {
      switch (exchange) {
        case "uniswap":
          return 'https://etherscan.io/'
        case "pancake":
          return 'https://bscscan.com/'
        case "sushiswap":
          return 'https://etherscan.io/'
        case "quickswap":
          return 'https://explorer-mainnet.maticvigil.com/'
      }
    },
  },
};
</script>

<style>
h3 {
  margin-bottom: 5%;
}
.box {
  display: flex;
}
label {
  display: inline-block;
  float: left;
  clear: left;
  text-align: right;
}
</style>