import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isSameOrigin} from '../lib/request-origin.ts';
test('Origin checks use the public host behind the proxy while blocking other origins',()=>{
 const request=(headers)=>new Request('http://internal:3000/api/admin-auth',{headers});
 const publicHeaders={host:'school.example',origin:'https://school.example','x-forwarded-proto':'https'};
 assert.equal(isSameOrigin(request(publicHeaders)),true);
 for(const change of [{origin:'https://attacker.example'},{origin:'http://school.example'},{origin:'null'},{origin:'https://school.example/path'},{origin:'https://school.example:444'},{origin:''},{host:''},{'x-forwarded-proto':'https,http'}])assert.equal(isSameOrigin(request({...publicHeaders,...change})),false);
 assert.equal(isSameOrigin(request({...publicHeaders,origin:'https://attacker.example','x-forwarded-host':'attacker.example'})),false);
 assert.equal(isSameOrigin(request({host:'localhost:3000',origin:'http://localhost:3000'})),true);
});
