import {cookies} from 'next/headers';
import {authDb,SESSION_COOKIE,passwordHash,equalHash,randomToken,tokenHash,ensureConfiguredAdmin,configuredUsername,resolveSchoolOwner} from '@/lib/admin-auth';
export const dynamic='force-dynamic';
const reply=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Request not allowed.'},403);
 try{
 const body:any=await req.json(),db=authDb(),jar=await cookies();
 if(!configuredUsername())return reply({error:'Admin sign-in is not configured.'},503);
 const owner=await resolveSchoolOwner();
 if(body.action==='logout'){const token=jar.get(SESSION_COOKIE)?.value;if(token)await db.prepare('DELETE FROM admin_sessions WHERE token=? AND owner=?').bind(await tokenHash(token),owner).run();return Response.json({ok:true},{headers:{'Set-Cookie':`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,'Cache-Control':'no-store'}})}
 await ensureConfiguredAdmin(owner);
 if(body.action!=='login'||typeof body.email!=='string'||typeof body.password!=='string'||body.password.length>128||body.password.length<(configuredUsername()?4:12))return reply({error:'Enter your username and password.'},400);
 const now=Date.now();
 await db.prepare('INSERT INTO login_limits (owner,attempts,reset_at) VALUES (?,0,?) ON CONFLICT(owner) DO UPDATE SET attempts=0,reset_at=excluded.reset_at WHERE login_limits.reset_at<=?').bind(owner,now+900000,now).run();
 const limit=await db.prepare('UPDATE login_limits SET attempts=attempts+1 WHERE owner=? AND attempts<8 RETURNING attempts').bind(owner).first();
 if(!limit)return reply({error:'Too many attempts. Please try again in 15 minutes.'},429);
 const email=body.email.trim().toLowerCase();
 if(email!==configuredUsername().toLowerCase())return reply({error:'Incorrect username or password.'},401);
 const account=await db.prepare('SELECT salt,hash,email FROM admin_credentials WHERE owner=?').bind(owner).first();
 if(!account||!equalHash(await passwordHash(body.password,account.salt),account.hash))return reply({error:'Incorrect username or password.'},401);
 const token=randomToken();await db.batch([db.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now),db.prepare('INSERT INTO admin_sessions (token,owner,expires) VALUES (?,?,?)').bind(await tokenHash(token),owner,now+28800000),db.prepare('DELETE FROM login_limits WHERE owner=?').bind(owner)]);
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
 }catch(e){console.error('Admin sign-in unavailable');return reply({error:'Sign-in is temporarily unavailable. Please try again.'},503)}
}
