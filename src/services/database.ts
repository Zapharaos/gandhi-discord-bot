import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import path from "path";
import {Logger} from "@services/logger";
import Logs from "../../lang/logs.json";
import {DB} from "../types/db";

const defaultDbFilePath = process.env.DATABASE_URL ?? "data/gandhi-bot.db";

Logger.info(Logs.info.sqliteConnect.replaceAll('{DATABASE}', defaultDbFilePath));

const dialect = new SqliteDialect({
    database: new SQLite(path.join(process.cwd(), defaultDbFilePath)),
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how to communicate with your database.
export const db = new Kysely<DB>({
    dialect,
})