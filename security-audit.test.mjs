import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('extension sends only local requests with redirects disabled and no ambient credentials',async()=>{
 const calls=[];let complete;
 const done=new Promise(r=>complete=r);
 const browser={storage:{local:{get:async key=>key==='paused'?{}:{pairingToken:'a'.repeat(64)}}},browserAction:{onClicked:{addListener:()=>{}},setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},tabs:{query:async()=>[]}};
 const ctx=vm.createContext({browser,URL,setTimeout:()=>complete(),fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>[{id:'fixture',name:'zen_tabs',args:{}}]}}});
 vm.runInContext(readFileSync(new URL('./extension/background.js',import.meta.url),'utf8'),ctx);await done;
 assert.equal(calls.length,2);
 for(const {url,options} of calls){assert.equal(new URL(url).origin,'http://127.0.0.1:19387');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');}
 const m=JSON.parse(readFileSync(new URL('./extension/manifest.json',import.meta.url)));
 assert.match(m.content_security_policy,/connect-src http:\/\/127\.0\.0\.1:19387;/);
 assert.ok(!m.web_accessible_resources);assert.ok(!m.externally_connectable);
});
