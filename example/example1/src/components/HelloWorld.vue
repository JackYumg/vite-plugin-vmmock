<script setup lang="ts">
import axios from 'axios';
import { defineComponent, onMounted, ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)
onMounted(() => {
  axios.get('/apis/images').then( (e) => {
    console.log(e);
  });
});
</script>

<template>
   <button type="button" @click="count++">count is: {{ msg }}</button>
</template>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
