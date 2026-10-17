import { AwsClient } from 'aws4fetch';

type Query = { sql: string; params: unknown[] };
type QueryResult = { success: boolean; results: Record<string, any>[]; meta: { changes: number } };
type Fetcher = typeof fetch;
type DatabaseConfig = () => { accountId: string; databaseId: string; token: string };
type BucketConfig = () => { accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string };

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export class D1RestDatabase {
  private readonly config: DatabaseConfig;
  private readonly request: Fetcher;
  constructor(config: DatabaseConfig, request: Fetcher = fetch) { this.config = config; this.request = request; }

  async query(queries: Query[]): Promise<QueryResult[]> {
    const { accountId, databaseId, token } = this.config();
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`;
    const response = await this.request(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: queries }), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    // Never log the request headers, SQL, or upstream body: they can contain
    // credentials and private school records. Do not retry writes automatically.
    if (!response.ok) throw new Error(`Database request failed (HTTP ${response.status}).`);
    const body = await response.json() as { success?: boolean; result?: QueryResult[] };
    if (body.success !== true || !Array.isArray(body.result) || body.result.length !== queries.length || body.result.some((r: QueryResult) => !r.success)) {
      throw new Error('Database query failed. Check the D1 configuration and migrations.');
    }
    return body.result;
  }

  prepare(sql: string) { return new D1RestStatement(this, sql); }
  batch(statements: D1RestStatement[]) { return this.query(statements.map(s => s.toQuery())); }
}

class D1RestStatement {
  private readonly db: D1RestDatabase;
  private readonly sql: string;
  private readonly params: unknown[];
  constructor(db: D1RestDatabase, sql: string, params: unknown[] = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params: unknown[]) { return new D1RestStatement(this.db, this.sql, params); }
  toQuery(): Query { return { sql: this.sql, params: this.params }; }
  async all() { return (await this.db.query([this.toQuery()]))[0]; }
  run() { return this.all(); }
  async first(column?: string) {
    const row = (await this.all()).results[0];
    return row ? (column ? row[column] : row) : null;
  }
}

export class R2RestBucket {
  private readonly config: BucketConfig;
  constructor(config: BucketConfig) { this.config = config; }
  private target(key: string) {
    const { accountId, bucket, accessKeyId, secretAccessKey } = this.config();
    if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error('Invalid Cloudflare account ID.');
    return {
      client: new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto', retries: 0 }),
      url: `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`,
    };
  }
  async get(key: string) {
    const { client, url } = this.target(key);
    const response = await client.fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Logo storage request failed (HTTP ${response.status}).`);
    return { body: response.body, httpMetadata: { contentType: response.headers.get('Content-Type') || 'application/octet-stream' } };
  }
  async put(key: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string } }) {
    const { client, url } = this.target(key);
    const response = await client.fetch(url, {
      method: 'PUT', body: new Uint8Array(bytes).buffer,
      headers: { 'Content-Type': options.httpMetadata.contentType }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Logo storage request failed (HTTP ${response.status}).`);
  }
}

// Credentials are read only when a request needs storage. A build requires no
// database access and cannot accidentally create or modify production records.
export const env = {
  DB: new D1RestDatabase(() => ({ accountId: required('CLOUDFLARE_ACCOUNT_ID'), databaseId: required('CLOUDFLARE_D1_DATABASE_ID'), token: required('CLOUDFLARE_API_TOKEN') })),
  BUCKET: new R2RestBucket(() => ({ accountId: required('CLOUDFLARE_ACCOUNT_ID'), bucket: required('CLOUDFLARE_R2_BUCKET_NAME'), accessKeyId: required('CLOUDFLARE_R2_ACCESS_KEY_ID'), secretAccessKey: required('CLOUDFLARE_R2_SECRET_ACCESS_KEY') })),
  get ADMIN_USERNAME() { return process.env.ADMIN_USERNAME; },
  get ADMIN_PASS_SALT() { return process.env.ADMIN_PASS_SALT; },
  get ADMIN_PASS_HASH() { return process.env.ADMIN_PASS_HASH; },
};
