import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:30000,workers:1,use:{baseURL:process.env.PE_HUB_TEST_URL||'http://127.0.0.1:5173/',browserName:'chromium',channel:'msedge',headless:true,viewport:{width:1440,height:1000}},reporter:'list'});
