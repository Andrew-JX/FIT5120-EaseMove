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
  background: linear-gradient(135deg, #f8fafc 0%, #edf6f9 50%, #f8fafc 100%);
  min-height: 100vh;
  color: #111827;
}

#app {
  min-height: 100vh;
}
</style>
