import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
test('MCP initialization, tool schemas, authentication, origin checks and bridge round trip',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,ZEN_CONNECTOR_PORT:'19388'},stdio:['pipe','pipe','pipe']});
 const replies=new Map();createInterface({input:child.stdout}).on('line',l=>{const m=JSON.parse(l);replies.get(m.id)?.(m);});let id=0;
 const call=(method,params={})=>new Promise(resolve=>{const n=++id;replies.set(n,resolve);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:n,method,params})+'\n');});
 try{
 assert.equal((await call('initialize',{protocolVersion:'2024-11-05'})).result.serverInfo.name,'zen-connector');
 assert.equal((await call('tools/list')).result.tools.length,6);
 const url='http://127.0.0.1:19388';const token=JSON.parse(readFileSync(new URL('./connection.json',import.meta.url))).token;const headers={Authorization:'Bearer '+token};
 for(let n=0;n<50;n++){try{await fetch(url);break;}catch{await new Promise(r=>setTimeout(r,20));}}
 assert.equal((await fetch(url+'/poll')).status,401);
 for(const endpoint of ['/poll','/result','/command']){
   assert.equal((await fetch(url+endpoint,{method:endpoint==='/poll'?'GET':'POST',headers:{Authorization:'Bearer '+'0'.repeat(64)}})).status,401);
 }
 assert.equal((await fetch(url+'/command',{method:'POST',headers,body:'{}'})).status,404);
 assert.equal((await fetch(url+'/poll',{headers:{...headers,Origin:'https://malicious.example'}})).status,403);
 const wrongHost=await new Promise((resolve,reject)=>{http.get(url+'/poll',{headers:{...headers,Host:'attacker.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
 assert.equal(wrongHost,403);
 assert.equal((await fetch(url+'/poll',{headers:{...headers,Origin:'moz-extension://fake/extra'}})).status,403);
 const response=call('tools/call',{name:'zen_tabs',arguments:{}});
 let cmds=[];for(let n=0;n<50&&!cmds.length;n++){cmds=await (await fetch(url+'/poll',{headers})).json();if(!cmds.length)await new Promise(r=>setTimeout(r,20));}
 assert.equal(cmds[0].name,'zen_tabs');
 await fetch(url+'/result',{method:'POST',headers,body:JSON.stringify({id:cmds[0].id,result:[{tabId:1,title:'Fixture'}]})});
 assert.equal(JSON.parse((await response).result.content[0].text)[0].title,'Fixture');
 assert.ok((await call('tools/call',{name:'zen_navigate',arguments:{tabId:1,url:'file:///secret'}})).error);
 assert.ok((await call('tools/call',{name:'zen_click',arguments:{tabId:1,observation:'x',element:-1}})).error);
 }finally{child.kill();}
});
test('page observations, field filling, stale actions and password protection',async()=>{
 let listener;class Input {constructor(type='text'){this.type=type;this.tagName='INPUT';this.isConnected=true;this.disabled=false;this.events=[];}getClientRects(){return [1];}getAttribute(){return null;}dispatchEvent(e){this.events.push(e.type);}}
 Object.defineProperty(Input.prototype,'value',{set(v){this.actualValue=v;},get(){return this.actualValue;}});
 class Textarea extends Input{}
 const input=new Input(),password=new Input('password');let clicks=0;const button={tagName:'BUTTON',isConnected:true,getClientRects:()=>[1],getAttribute:()=>null,innerText:'Run',click:()=>clicks++};
 const ctx=vm.createContext({browser:{runtime:{onMessage:{addListener:f=>listener=f}}},document:{title:'Fixture',body:{innerText:'Fixture page'},querySelectorAll:()=>[input,password,button]},location:{href:'https://example.com/'},crypto:{randomUUID:()=>Math.random().toString()},HTMLInputElement:Input,HTMLTextAreaElement:Textarea,Event:class{constructor(type){this.type=type;}}});
 const source=readFileSync(new URL('./extension/content.js',import.meta.url),'utf8');vm.runInContext(source,ctx);vm.runInContext(source,ctx);
 let page=await listener({name:'zen_read',args:{}});assert.equal(page.elements.length,3);
 assert.throws(()=>listener({name:'zen_fill',args:{observation:page.observation,element:1,text:'secret'}}),/cannot be filled/);
 await listener({name:'zen_fill',args:{observation:page.observation,element:0,text:'Hello'}});assert.equal(input.value,'Hello');assert.deepEqual(input.events,['input','change']);
 assert.throws(()=>listener({name:'zen_click',args:{observation:page.observation,element:2}}),/Stale/);
 page=await listener({name:'zen_read',args:{}});await listener({name:'zen_click',args:{observation:page.observation,element:2}});assert.equal(clicks,1);
 page=await listener({name:'zen_read',args:{}});button.isConnected=false;assert.throws(()=>listener({name:'zen_click',args:{observation:page.observation,element:2}}),/changed/);
});
