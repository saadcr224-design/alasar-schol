import {requireChatGPTUser} from './chatgpt-auth';
import {authDb,ensureConfiguredAdmin,configuredUsername} from '@/lib/admin-auth';
import LoginForm from './login-form';
export const dynamic='force-dynamic';
export default async function Home(){const user=await requireChatGPTUser('/');try{await ensureConfiguredAdmin(user.userId);const account=await authDb().prepare('SELECT owner FROM admin_credentials WHERE owner=?').bind(user.userId).first();return <LoginForm setup={!account} email={configuredUsername()||user.email}/>;}catch{return <main className="admin-login-page"><section className="admin-login-box"><h1>Sign-in unavailable</h1><p>We couldn’t load your account. Please try again.</p><a href="/" className="primary wide">Try again</a></section></main>}}
