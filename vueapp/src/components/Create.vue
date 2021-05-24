<template>
  <div class="container" style="max-width: 950px">
    <h4>Create Order</h4>

    <div class="box">
      <div id="createOrder">
        <!-- <div
          class="list"
          v-for="name in Object.keys(generalFields)"
          v-bind:key="name"
        >
          <label v-bind:for="name">{{ generalFields[name]["label"] }}</label>
          <input v-bind:name="name" v-bind:type="generalFields[name].type" />
        </div>

        <div class="list" v-for="name in Object.keys(fields)" v-bind:key="name">
          <label v-bind:for="name">{{ fields[name]["label"] }}</label>
          <input v-bind:name="name" v-bind:type="fields[name].type" />
        </div> -->

        <div class="container">
          <div class="form-group">
            <label for="exampleFormControlSelect1">Type</label>
            <select name="orderType" @change="onTypeChange($event)" class="form-control">
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
                  <input
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
                  <select v-if="fields[name].type === 'dropdown'" v-bind:name="name" class="form-control">
                    <option
                v-for="option in fields[name].options"
                v-bind:key="option"
                v-bind:value="option"
              >
                {{ option }}
              </option>
                  </select>
                  <input v-else
                    class="form-control"
                    v-bind:name="name"
                    v-bind:type="fields[name].type"
                  />
                </div>
                <button v-on:click="createOrder" type="submit" class="btn btn-success">Create</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { constants } from "../data/data";
import axios from "axios";
import { config } from "../../config";

export default {
  name: "Create",
  data() {
    return {
      generalFields: constants.generalFields,
      types: constants.types,
      fields: {},
    };
  },
  methods: {
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
    createOrder(event) {
      event.preventDefault()
      const data = {

      }
      document.querySelectorAll("input").forEach(el => data[el.name] = el.value)
      document.querySelectorAll("select").forEach(el => data[el.name] = el.value)
      console.log(data)
      axios({
        method: "POST",
        url: `${config.rest}/new`,
        data
      }).then((order) => {
        console.log(order)
        //this.orders.push(order)
      });
    }
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