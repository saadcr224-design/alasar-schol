import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';

if(!stdin.isTTY||!stdout.isTTY)throw Error('Run this script in an interactive terminal.');
const prompt=createInterface({input:stdin,output:stdout});
const username=(await prompt.question('Administrator username: ')).trim();
prompt.close();
if(!/^[A-Za-z0-9@._+-]{1,160}$/.test(username))throw Error('Use letters, digits, @, dot, underscore, plus or hyphen in the username.');

function password(label){
 stdout.write(label);
 return new Promise((resolve,reject)=>{
  let value='';const wasRaw=stdin.isRaw;stdin.setRawMode(true);stdin.resume();
  function finish(error){stdin.off('data',read);stdin.setRawMode(!!wasRaw);stdin.pause();stdout.write('\n');error?reject(error):resolve(value);}
  function read(chunk){for(const character of chunk.toString()){
   if(character==='\u0003'){finish(Error('Cancelled.'));return;}
   if(character==='\r'||character==='\n'){finish();return;}
   if(character==='\u007f'||character==='\b')value=value.slice(0,-1);
   else if(character>=' ')value+=character;
  }}
  stdin.on('data',read);
 });
}
const secret=await password('Password (at least 12 characters, hidden): ');
if(secret.length<12||secret.length>128)throw Error('Use between 12 and 128 characters.');
if(secret!==await password('Confirm password (hidden): '))throw Error('Passwords do not match.');
const salt=randomBytes(32).toString('hex');
const hash=pbkdf2Sync(secret,salt,100000,32,'sha256').toString('hex');
writeFileSync('.env.admin.local',`ADMIN_USERNAME=${username}\nADMIN_PASS_SALT=${salt}\nADMIN_PASS_HASH=${hash}\n`,{mode:0o600,flag:'wx'});
stdout.write('Saved administrator configuration to .env.admin.local. Add these values in Vercel settings, then redeploy.\n');
