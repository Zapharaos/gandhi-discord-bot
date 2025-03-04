const fs = require('fs');
const path = require('path');
const {connect} = require("./utils/sqlite");

// TODO : Rollback to specific migration

const migrationsDir = path.join(__dirname, 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir).sort();

// Create db folder if not exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Connect to the database
const db = connect();

// Ensure the migrations table exists
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )
    `);
});

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
        const migration = require(path.join(__dirname, 'migrations', file));

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

// Run all pending migrations
(async () => {
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
})();