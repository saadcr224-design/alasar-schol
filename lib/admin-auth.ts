import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const SESSION_COOKIE='__Host-school_admin';
export function authDb(){const db=(env as any).DB;if(!db)throw Error('Account storage unavailable');return db;}
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export const tokenHash=async(token:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
export function equalHash(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
export async function getAdminUser(){const user=await getChatGPTUser();if(!user)return null;const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token||!/^([a-f0-9]{64})$/.test(token))return null;const session=await authDb().prepare('SELECT owner FROM admin_sessions WHERE token=? AND owner=? AND expires>?').bind(await tokenHash(token),user.userId,Date.now()).first();return session?{...user,schoolId:await resolveSchoolOwner(user)}:null;}
export function configuredUsername(){return String((env as any).ADMIN_USERNAME||'');}
export async function ensureConfiguredAdmin(owner:string){const e=env as any;if(!e.ADMIN_USERNAME||!e.ADMIN_PASS_SALT||!e.ADMIN_PASS_HASH)return;const db=authDb(),row=await db.prepare('SELECT email,hash FROM admin_credentials WHERE owner=?').bind(owner).first();if(row?.hash===e.ADMIN_PASS_HASH&&row?.email===e.ADMIN_USERNAME)return;await db.batch([db.prepare('INSERT INTO admin_credentials (owner,email,salt,hash) VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET email=excluded.email,salt=excluded.salt,hash=excluded.hash').bind(owner,e.ADMIN_USERNAME,e.ADMIN_PASS_SALT,e.ADMIN_PASS_HASH),db.prepare('DELETE FROM admin_sessions WHERE owner=?').bind(owner),db.prepare('DELETE FROM login_limits WHERE owner=?').bind(owner)]);}
export async function resolveSchoolOwner(user:{userId:string;email:string}){
 const db=authDb();let school=await db.prepare('SELECT owner FROM school_workspace WHERE id=?').bind('school').first();if(school)return school.owner as string;
 const ownerEmail=String((env as any).SCHOOL_OWNER_EMAIL||'').toLowerCase();
 if(!ownerEmail||user.email.toLowerCase()!==ownerEmail)throw Error('The school owner must sign in once to prepare shared records.');
 await db.prepare('INSERT OR IGNORE INTO school_workspace (id,owner) VALUES (?,?)').bind('school',user.userId).run();
 school=await db.prepare('SELECT owner FROM school_workspace WHERE id=?').bind('school').first();return school.owner as string;
}
