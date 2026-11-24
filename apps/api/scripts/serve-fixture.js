import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startFixture} from '../test/fixtures.js';

const production=process.argv.includes('--production');
const webPort=Number(process.env.GALLERMO_FIXTURE_PORT||(production?55174:55173));
const origin='http://127.0.0.1:'+webPort;
const privateRoot=await mkdtemp(path.join(os.tmpdir(),'gallermo-browser-'));
process.env.GALLERMO_TEST_PRIVATE_ROOT=privateRoot;
const stopFixture=await startFixture({origin,full:true});
const {app}=await import('../src/index.js');
const api=app.listen(0,'127.0.0.1');
await once(api,'listening');
const web=spawn(process.execPath,[production?'start.js':'server.js'],{
  cwd:fileURLToPath(new URL('../../web/',import.meta.url)),
  env:{...process.env,PORT:String(webPort),PUBLIC_SITE_URL:origin,API_INTERNAL_URL:'http://127.0.0.1:'+api.address().port,NO_INDEX:'true',GALLERMO_HMR_PORT:production?'':String(webPort+5)},
  stdio:'inherit'
});
let stopping=false;
const stop=async()=>{
  if(stopping)return;
  stopping=true;
  if(web.exitCode===null)web.kill();
  await new Promise(resolve=>api.close(resolve));
  await stopFixture();
  await rm(privateRoot,{recursive:true,force:true});
};
process.on('SIGINT',()=>void stop());
process.on('SIGTERM',()=>void stop());
web.on('exit',code=>{void stop().then(()=>{process.exitCode=code||0;});});
