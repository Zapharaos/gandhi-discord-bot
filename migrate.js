import fs from 'fs';
import path from 'path';
import { connect } from './utils/sqlite.js';
import {fileURLToPath, pathToFileURL} from "url";

// TODO : Rollback to specific migration

// Create db folder if not exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrations = path.join(__dirname, 'migrations');

// Connect to the database
const db = connect();

// Function to get applied migrations
function getAppliedMigrations() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT name FROM migrations`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.name));
        });
    });
}

// Function to run a migration
function runMigration(file) {
    return new Promise((resolve, reject) => {
        const migration = import(pathToFileURL(path.join(migrations, file)).href);

        console.log(`Applying migration: ${file}`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            migration.up(db);

            db.run(`INSERT INTO migrations (name) VALUES (?)`, [file], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return reject(err);
                }

                db.run("COMMIT");
                resolve();
            });
        });
    });
}

// Ensure the migrations table exists
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )
    `, async (err) => {
        if (err) {
            console.error("❌  Error creating migrations table:", err);
            db.close();
            return;
        }

        // Run all pending migrations
        try {
            const appliedMigrations = await getAppliedMigrations();
            const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations')).filter(file => file.endsWith('.js'));
            const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.includes(file));

            if (pendingMigrations.length === 0) {
                console.log("✅  No new migrations to apply.");
            } else {
                for (const migration of pendingMigrations) {
                    await runMigration(migration);
                }
                console.log("✅  All migrations applied successfully.");
            }
        } catch (error) {
            console.error("❌  Migration error:", error);
        } finally {
            db.close();
        }
    });
});