<template>
  <div id="app">
    <Create />
    <Orders />
  </div>
</template>

<script>
import Orders from './components/Orders.vue'
import Create from './components/Create.vue'

export default {
  name: 'app',
  components: {
    Orders,
    Create
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
button {margin: 2%;}
.green {background-color: #009933;}
.blue {background-color: #669999;} /* Blue */
.red {background-color: #ff9999;}
</style>