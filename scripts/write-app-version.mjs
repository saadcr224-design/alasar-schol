import {writeFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';writeFileSync('public/app-version.json',JSON.stringify({version:randomUUID(),builtAt:new Date().toISOString()}));
