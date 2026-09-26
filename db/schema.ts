import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const ledgers = sqliteTable('ledgers', { owner: text('owner').primaryKey(), data: text('data').notNull(), revision: integer('revision').notNull().default(0) });
export const adminCredentials = sqliteTable('admin_credentials',{owner:text('owner').primaryKey(),email:text('email').notNull(),salt:text('salt').notNull(),hash:text('hash').notNull()});
export const adminSessions = sqliteTable('admin_sessions',{token:text('token').primaryKey(),owner:text('owner').notNull(),expires:integer('expires').notNull()});
export const loginLimits = sqliteTable('login_limits',{owner:text('owner').primaryKey(),attempts:integer('attempts').notNull(),resetAt:integer('reset_at').notNull()});
export const schoolWorkspace=sqliteTable('school_workspace',{id:text('id').primaryKey(),owner:text('owner').notNull()});
