// Vinext resolves the native bindings. Next.js replaces this module with
// vercel-runtime.ts, so cloudflare:workers never enters the Node.js bundle.
export { env } from 'cloudflare:workers';
