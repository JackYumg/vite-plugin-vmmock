import { createApp } from 'vue'
import App from './App.vue'
import { createMockLogger } from './../../../src/logger/vamock-logger';
import axios from 'axios';
const app = createApp(App);
createMockLogger().axiosLogger.createAxiosLogger({
    'api': '/apis',
    showLogger: true
}).install(app, axios)
app.mount('#app');
