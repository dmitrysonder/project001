<template>
  <div class="container">
    <h4>Create Order</h4>
    <label>Type</label>
    <select @change="onTypeChange($event)">
      <option v-for="type in types" v-bind:key="type" v-bind:value="type">
        {{ type }}
      </option>
    </select>

    <div class="box">
      <div id="createOrder">
        <div class="list" v-for="name in Object.keys(fields)" v-bind:key="name">
          <label v-bind:for="name">{{fields[name]["label"]}}</label>
          <input 
          v-bind:name="name" 
          v-bind:type="fields[name].type"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { constants } from "../data/data";

export default {
  name: "Create",
  data() {
    return {
      types: constants.types,
      fields: {},
    };
  },
  methods: {
    onTypeChange(event) {
      switch (event.target.value) {
        case "Limit Order":
          this.fields = {
            ...constants.generalFields,
            ...constants.limitOrder,
          };
          break;
        case "Timestamp Order":
          this.fields = {
            ...constants.generalFields,
            ...constants.timestampOrder,
          };
          break;
        case "Listing Order":
          this.fields = {
            ...constants.generalFields,
            ...constants.listingOrder,
          };
          break;
        case "Front-Running":
          this.fields = {
            ...constants.generalFields,
            ...constants.frontRun,
          };
          break;
        case "Bot":
          this.fields = {
            ...constants.generalFields,
            ...constants.bot,
          };
          break;
      }
    },
  },
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
.list {
  justify-content: right;
}
</style>