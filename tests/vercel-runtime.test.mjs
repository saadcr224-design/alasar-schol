import {test} from 'node:test';
import assert from 'node:assert/strict';
import {D1RestDatabase,R2RestBucket,env} from '../lib/vercel-runtime.ts';

const config=()=>({accountId:'a'.repeat(32),databaseId:'test-database',token:'test-only-token'});
const result=(results=[],changes=0)=>({success:true,results,meta:{changes}});
const response=(...rows)=>Response.json({success:true,result:rows});

test('D1 adapter binds values separately, disables caching, and preserves optimistic update counts',async()=>{
 const calls=[];
 const db=new D1RestDatabase(config,async(url,options)=>{calls.push({url,options});return response(result([{revision:3}],1));});
 const statement=db.prepare('SELECT revision FROM ledgers WHERE owner = ?');
 assert.equal((await statement.bind("school's account").first()).revision,3);
 assert.equal(await statement.bind('school').first('revision'),3);
 assert.equal((await statement.bind('school').run()).meta.changes,1);
 const {url,options}=calls[0];assert.match(url,/\/d1\/database\/test-database\/query$/);
 assert.deepEqual(JSON.parse(options.body),{batch:[{sql:'SELECT revision FROM ledgers WHERE owner = ?',params:["school's account"]}]});
 assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,'Bearer test-only-token');
 assert.deepEqual(statement.toQuery().params,[]);
});

test('D1 batch is one request and retains the order and parameter types of every statement',async()=>{
 let calls=0;
 const db=new D1RestDatabase(config,async(url,options)=>{
  calls++;assert.deepEqual(JSON.parse(options.body).batch,[{sql:'DELETE FROM admin_sessions WHERE expires<=?',params:[100]},{sql:'INSERT INTO admin_sessions VALUES (?,?,?)',params:['token','school',200]}]);
  return response(result([],1),result([],1));
 });
 assert.equal((await db.batch([db.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(100),db.prepare('INSERT INTO admin_sessions VALUES (?,?,?)').bind('token','school',200)])).length,2);
 assert.equal(calls,1);
});

test('D1 empty reads return null, API errors fail closed without retrying or leaking response content',async()=>{
 const db=new D1RestDatabase(config,async()=>response(result()));assert.equal(await db.prepare('SELECT 1').first(),null);
 for(const reply of [new Response('secret upstream detail',{status:403}),Response.json({success:false,errors:[{message:'private SQL'}]}),response({success:false,results:[]}),response()]){
  let calls=0;const broken=new D1RestDatabase(config,async()=>{calls++;return reply;});
  await assert.rejects(()=>broken.prepare('SELECT 1').run(),e=>!e.message.includes('private SQL')&&!e.message.includes('secret upstream detail'));assert.equal(calls,1);
 }
});

test('Missing Vercel configuration does not break module import but rejects storage operations',async()=>{
 const old=process.env.CLOUDFLARE_ACCOUNT_ID;delete process.env.CLOUDFLARE_ACCOUNT_ID;
 try{await assert.rejects(()=>env.DB.prepare('SELECT 1').run(),/Missing server configuration: CLOUDFLARE_ACCOUNT_ID/)}finally{if(old!==undefined)process.env.CLOUDFLARE_ACCOUNT_ID=old;}
});

test('R2 signs private uploads, encodes keys, and distinguishes not found from storage failure',async()=>{
 const original=globalThis.fetch,calls=[];
 const bucket=new R2RestBucket(()=>({accountId:'a'.repeat(32),bucket:'school-logos',accessKeyId:'test-key',secretAccessKey:'test-secret'}));
 globalThis.fetch=async request=>{calls.push(request);return new Response(request.method==='GET'?'logo':null,{headers:{'Content-Type':'image/png'}})};
 try{
  await bucket.put('logos/school name/version',new Uint8Array([1,2,3]),{httpMetadata:{contentType:'image/png'}});
  const upload=calls[0];assert.match(upload.url,/\/school-logos\/logos\/school%20name\/version$/);assert.match(upload.headers.get('Authorization'),/^AWS4-HMAC-SHA256 /);assert.equal(upload.headers.get('Content-Type'),'image/png');assert.deepEqual([...new Uint8Array(await upload.arrayBuffer())],[1,2,3]);
  const file=await bucket.get('logos/school/version');assert.equal(file.httpMetadata.contentType,'image/png');assert.equal(await new Response(file.body).text(),'logo');
  globalThis.fetch=async()=>new Response(null,{status:404});assert.equal(await bucket.get('missing'),null);
  globalThis.fetch=async()=>new Response(null,{status:403});await assert.rejects(()=>bucket.get('private'),/HTTP 403/);
 }finally{globalThis.fetch=original;}
});
