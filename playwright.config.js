import {existsSync} from 'node:fs';
import {defineConfig} from '@playwright/test';

const production=process.env.GALLERMO_WEB_BUILD==='production';
const origin='http://127.0.0.1:'+(process.env.GALLERMO_FIXTURE_PORT||(production?55174:55173));
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
  testDir:'./apps/web/e2e',
  outputDir:production?'test-results/production':'test-results/development',
  fullyParallel:false,workers:1,timeout:45000,
  use:{baseURL:origin,trace:'retain-on-failure',launchOptions:existsSync(edge)?{executablePath:edge}:{}},
  webServer:{
    command:'node apps/api/scripts/serve-fixture.js'+(production?' --production':''),
    url:origin+'/api/health',timeout:90000,reuseExistingServer:false,
    stdout:'ignore',stderr:'pipe'
  }
});
