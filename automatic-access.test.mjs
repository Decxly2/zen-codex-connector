import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('automatic tabs exclude private/internal tabs; pause persists and prevents access', async()=>{
  let clicked;const stored={};let reads=0;
  const tabs=[{id:1,url:'https://example.com/',title:'Normal'}, {id:2,url:'https://private.example/',incognito:true}, {id:3,url:'about:config'}, {id:4,url:'file:///secret'}];
  const browser={storage:{local:{get:async()=>stored,set:async s=>Object.assign(stored,s)}},browserAction:{onClicked:{addListener:f=>clicked=f},setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},tabs:{query:async()=>tabs,get:async id=>tabs.find(t=>t.id===id),executeScript:async()=>{reads++},sendMessage:async()=>({text:'normal'}),update:async()=>{}}};
  const ctx=vm.createContext({browser,URL,setTimeout:()=>{},fetch:async()=>{throw Error('offline')}});
  vm.runInContext(readFileSync(new URL('./extension/background.js',import.meta.url),'utf8'),ctx);
  const run=cmd=>{ctx.cmd=cmd;return vm.runInContext('run(cmd)',ctx)};
  assert.equal((await run({name:'zen_tabs',args:{}})).length,1);assert.equal(reads,0);
  for(const tabId of [2,3,4]) await assert.rejects(run({name:'zen_read',args:{tabId}}),/ordinary/);
  assert.equal((await run({name:'zen_read',args:{tabId:1}})).text,'normal');assert.equal(reads,1);
  await clicked();assert.equal(stored.paused,true);await assert.rejects(run({name:'zen_read',args:{tabId:1}}),/paused/);
  await clicked();assert.equal(stored.paused,false);assert.equal((await run({name:'zen_tabs',args:{}})).length,1);
  const manifest=JSON.parse(readFileSync(new URL('./extension/manifest.json',import.meta.url)));
  assert.equal(manifest.incognito,'not_allowed');assert.ok(!manifest.permissions.includes('cookies'));assert.ok(!manifest.permissions.includes('history'));
});
