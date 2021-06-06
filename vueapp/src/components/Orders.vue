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
                id="orderType"
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
                      v-bind:id="name"
                      class="form-control"
                      name="general"
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
                      name="general"
                      v-bind:id="name"
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
                      v-bind:id="name"
                      name="additional"
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
                      name="additional"
                      v-bind:id="name"
                      v-bind:type="fields[name].type"
                    />
                  </div>
                  <div>
                    <button
                      v-on:click="createOrder"
                      type="submit"
                      class="btn btn-success"
                    >
                      <span id="createButton">Create</span>
                      <svg
                        id="loading"
                        style="display: none"
                        width="56"
                        height="23"
                        viewBox="0 0 120 30"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="darkgreen"
                      >
                        <circle cx="15" cy="15" r="15">
                          <animate
                            attributeName="r"
                            from="15"
                            to="15"
                            begin="0s"
                            dur="0.8s"
                            values="15;9;15"
                            calcMode="linear"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="fill-opacity"
                            from="1"
                            to="1"
                            begin="0s"
                            dur="0.8s"
                            values="1;.5;1"
                            calcMode="linear"
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle cx="60" cy="15" r="9" fill-opacity="0.3">
                          <animate
                            attributeName="r"
                            from="9"
                            to="9"
                            begin="0s"
                            dur="0.8s"
                            values="9;15;9"
                            calcMode="linear"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="fill-opacity"
                            from="0.5"
                            to="0.5"
                            begin="0s"
                            dur="0.8s"
                            values=".5;1;.5"
                            calcMode="linear"
                            repeatCount="indefinite"
                          />
                        </circle>
                        <circle cx="105" cy="15" r="15">
                          <animate
                            attributeName="r"
                            from="15"
                            to="15"
                            begin="0s"
                            dur="0.8s"
                            values="15;9;15"
                            calcMode="linear"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="fill-opacity"
                            from="1"
                            to="1"
                            begin="0s"
                            dur="0.8s"
                            values="1;.5;1"
                            calcMode="linear"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </svg>
                    </button>
                  </div>
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
                target="_blank"
                v-bind:href="
                  getLink(order.exchange) + 'address/' + order.pair.pool
                "
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
      this.orders = res.data?.orders;
    });
  },
  mounted() {
    this.fields = constants.limitOrder;
        if (!this.EventSource) {
      const source = new EventSource(`${config.rest}/sse`)
      console.log(this.$orders)
      const index = this.orderIndex("9065e0c3-2c37-4aed-9955-32841ce2d7f3")
      console.log(index)
      source.addEventListener(
        "message",
        function (event) {
          if (event.data) {
            const {uuid, type, value} = JSON.parse(event.data)[0]
            switch (type) {
              case 'status':
                this.orders[this.orderIndex(uuid)].status_ = value
                break;
              case 'price':
                this.orders[this.orderIndex(uuid)].currentPrice = value
                break;
              default:
                break;
            }
          }
        },
        false
      );

      source.addEventListener(
        "open",
        function () {
          console.log("Connected");
        },
        false
      );

      source.addEventListener(
        "error",
        function (e) {
          if (e.target.readyState == EventSource.CLOSED) {
            console.log("Disconnected")
          } else if (e.target.readyState == EventSource.CONNECTING) {
            console.log("Connecting...")
          }
        },
        false
      );
    } else {
      console.log("Your browser doesn't support SSE");
    }
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
    orderIndex(uuid) {
      return this.orders.findIndex(order => order.uuid_ === uuid)
    },
    onEditOrder(order) {
      document.querySelector("#token0").value = order.pair.token0.address;
      document.querySelector("#token1").value = order.pair.token1.address;
      document.querySelector("#exchange").value = order.exchange;
      document.querySelector("#amount").value = order.execution.amount;
      document.querySelector("#gasPrice").value = order.execution.gasPrice;
      document.querySelector("#maxSlippage").value =
        order.execution.maxSlippage;
      const type = document.querySelector("#orderType");
      type.value = order.type_;

      switch (order.type_) {
        case "price":
          document.querySelector("#trade").value = order.trigger_.action;
          document.querySelector("#price").value = order.trigger_.target;
          break;
        case "timestamp":
          document.querySelector("#trade").value = order.trigger_.action;
          document.querySelector("#date").value = order.trigger_.date;
          document.querySelector("#time").value = order.trigger_.time;
          break;
        case "bot":
          document.querySelector("#priceToBuy").value =
            order.trigger_.priceToBuy;
          document.querySelector("#priceToSell").value =
            order.trigger_.priceToSell;
          break;
        case "frontRunning":
          document.querySelector("#volume0").value = order.trigger_.volume0;
          document.querySelector("#volume1").value = order.trigger_.volume1;
          break;
        case "listing":
          document.querySelector("#trade").value = order.trigger_.action;
          break;
      }
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
      const order = this.orders.find((val) => val.uuid_ === uuid);
      axios({
        method: "POST",
        url: `${config.rest}/delete`,
        params: { uuid },
        data: { order },
      }).then(() => {
        const index = this.orders.findIndex((order) => order.uuid_ === uuid);
        this.orders.splice(index, 1);
      });
    },
    createOrder(event) {
      event.preventDefault();
      const data = {};
      const loading = document.querySelector("#loading");
      const createButton = document.querySelector("#createButton");
      createButton.style.display = "none";
      loading.style.display = "block";
      document
        .querySelectorAll("input")
        .forEach((el) => (data[el.id] = el.value));
      document
        .querySelectorAll("select")
        .forEach((el) => (data[el.id] = el.value));
      axios({
        method: "POST",
        url: `${config.rest}/new`,
        data,
      })
        .then((response) => {
          if (response?.data?.Attributes) {
            this.orders.push(response.data.Attributes);
          }
          loading.style.display = "none";
          createButton.style.display = "block";
        })
        .catch((e) => {
          console.log(e);
          loading.style.display = "none";
          createButton.style.display = "block";
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
          return "https://etherscan.io/";
        case "pancake":
          return "https://bscscan.com/";
        case "sushiswap":
          return "https://etherscan.io/";
        case "quickswap":
          return "https://explorer-mainnet.maticvigil.com/";
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