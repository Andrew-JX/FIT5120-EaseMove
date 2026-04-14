<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e3f2fd 50%, #f5f7fa 100%);
  min-height: 100vh;
  color: #111827;
}

#app {
  min-height: 100vh;
}
</style>
