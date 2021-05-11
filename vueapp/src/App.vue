<template>
  <div id="app">
    <Orders />
  </div>
</template>

<script>
import Orders from './components/Orders.vue'

export default {
  name: 'app',
  components: {
    Orders
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
</style>