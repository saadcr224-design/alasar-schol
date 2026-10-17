import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {pbkdf2Sync} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';

assert.ok(existsSync('.next/routes-manifest.json'),'Run pnpm run build:vercel first.');
const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
const salt='isolated-test-salt',password='Isolated-test-password-2026';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
 env:{...process.env,NODE_OPTIONS:`${process.env.NODE_OPTIONS||''} --import ${fileURLToPath(new URL('./fixtures/cloudflare-mock.mjs',import.meta.url))}`,SCHOOL_TEST_STORAGE:'isolated-fixture',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_D1_DATABASE_ID:'isolated-test-database',CLOUDFLARE_API_TOKEN:'isolated-test-token',CLOUDFLARE_R2_BUCKET_NAME:'isolated-test-bucket',CLOUDFLARE_R2_ACCESS_KEY_ID:'isolated-key',CLOUDFLARE_R2_SECRET_ACCESS_KEY:'isolated-secret',ADMIN_USERNAME:'test-admin',ADMIN_PASS_SALT:salt,ADMIN_PASS_HASH:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex'),NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']
});
let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
const base=`http://127.0.0.1:${port}`;let cookie='';
async function request(path,body,headers={}){return fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});}
try{
 let ready=false;for(let n=0;n<100;n++){if(child.exitCode!==null)throw Error(output);try{if((await request('/')).status===200){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready,'Production server did not start: '+output);
 assert.match(await (await request('/')).text(),/School Admin Login/);
 assert.equal((await request('/api/ledger')).status,401);
 assert.equal((await request('/portal')).status,307);
 assert.equal((await request('/api/admin-auth',{action:'login',email:'test-admin',password},{Origin:'https://untrusted.example'})).status,403);
 assert.equal((await request('/api/admin-auth',{action:'login',email:'test-admin',password:'incorrect'})).status,401);
 const login=await request('/api/admin-auth',{action:'login',email:'test-admin',password});assert.equal(login.status,200,await login.clone().text());
 const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/Secure/);assert.match(setCookie,/SameSite=Strict/);cookie=setCookie.split(';')[0];
 assert.equal((await request('/portal')).status,200);
 let state=await (await request('/api/ledger')).json();
 async function mutate(action,payload){const response=await request('/api/ledger',{action,payload:{...payload,sessionId:'legacy'},revision:state.revision});assert.equal(response.status,200,await response.clone().text());state=await response.json();}
 await mutate('student',{name:'Deployment test',roll:'DEPLOY-1',className:'Class 1',guardian:'Test parent',fee:5000,discount:500,transportFee:1000,uniformFee:1500,otherFee:750});
 const id=state.data.students[0].id;assert.equal(state.data.students[0].transportFee,1000);assert.equal(state.data.students[0].otherFee,750);
 await mutate('generate',{scope:'Individual student',studentId:id,month:'2026-10',endMonth:'2026-10',due:'2026-10-10',includeUniform:true,includeOther:true});
 assert.equal(state.data.invoices.reduce((n,i)=>n+i.amount,0),7750);
 await mutate('payment',{invoiceId:state.data.invoices[0].id,amount:1000,date:'2026-10-10',method:'Cash'});
 assert.equal(state.data.payments.reduce((n,p)=>n+p.amount,0),1000);
 assert.equal(state.data.invoices.reduce((n,i)=>n+i.amount,0)-state.data.payments.reduce((n,p)=>n+p.amount,0),6750);
 const reload=await (await request('/api/ledger')).json();assert.deepEqual(reload,state);
 const stale=await request('/api/ledger',{action:'student',payload:{},revision:0});assert.equal(stale.status,409);
 const logo=new FormData();const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);logo.append('logo',new Blob([bytes],{type:'image/png'}),'test.png');
 const upload=await request('/api/school-logo',logo);assert.equal(upload.status,200,await upload.clone().text());const {version}=await upload.json();
 const image=await request('/api/school-logo?version='+version);assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await image.arrayBuffer()),bytes);
 assert.equal((await request('/api/admin-auth',{action:'logout'})).status,200);assert.equal((await request('/api/ledger')).status,401);
 console.log('PASS: production login, auth guards, admission fees, fee generation, payments, saved records, revision conflicts, private logo upload/read and logout.');
}catch(error){console.error(output);throw error;}finally{child.kill('SIGTERM');await once(child,'exit');}
