// Used only by test:production, in a child process with explicitly fake credentials.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
if(process.env.SCHOOL_TEST_STORAGE!=='isolated-fixture')throw Error('Test storage must be explicitly enabled.');
const db=new DatabaseSync(':memory:');
for(const name of ['0000_wooden_sister_grimm.sql','0001_absurd_timeslip.sql','0002_gifted_madrox.sql'])db.exec(readFileSync(new URL('../../drizzle/'+name,import.meta.url),'utf8'));
const objects=new Map(),original=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 const request=input instanceof Request?input:new Request(input,options);
 const url=new URL(request.url);
 if(url.hostname==='api.cloudflare.com'){
  if(request.headers.get('Authorization')!=='Bearer isolated-test-token')return Response.json({success:false},{status:403});
  try{
   const {batch}=await request.json();db.exec('BEGIN');const result=[];
   for(const {sql,params} of batch){const results=db.prepare(sql).all(...params);const changes=db.prepare('SELECT changes() AS n').get().n;result.push({success:true,results,meta:{changes}});}
   db.exec('COMMIT');return Response.json({success:true,result});
  }catch{db.exec('ROLLBACK');return Response.json({success:false},{status:400});}
 }
 if(url.hostname.endsWith('.r2.cloudflarestorage.com')){
  if(!request.headers.get('Authorization')?.startsWith('AWS4-HMAC-SHA256 '))return new Response(null,{status:403});
  if(request.method==='PUT'){objects.set(url.pathname,{body:await request.arrayBuffer(),type:request.headers.get('Content-Type')});return new Response(null);}
  const file=objects.get(url.pathname);return file?new Response(file.body,{headers:{'Content-Type':file.type}}):new Response(null,{status:404});
 }
 // Tests must never contact real Cloudflare storage on a mismatched URL.
 if(url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')throw Error('External network is disabled in the production test.');
 return original(input,options);
};
