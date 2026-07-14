#!/bin/bash
# ---------------------------------------------------------------------------
# db-backup.sh — SQLite online backup for Gandhi Bot
#
# Usage:
#   ./scripts/db-backup.sh [MAX_BACKUPS]
#
#   MAX_BACKUPS  Number of backups to keep (default: 7, 0 = keep all)
#
# The script must be run from the project root (where .env lives), or from
# any directory — it resolves the project root from its own location.
#
# Backups are written to <project-root>/var/db-backups/ and logged to
# <project-root>/var/db-backups/backup.log.
#
# Requires sqlite3 to be installed on the host:
#   apt-get install -y sqlite3    # Debian/Ubuntu
# ---------------------------------------------------------------------------

set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env"
BACKUP_DIR="${PROJECT_DIR}/var/db-backups"
LOG_FILE="${BACKUP_DIR}/backup.log"

# ── Config ─────────────────────────────────────────────────────────────────
MAX_BACKUPS="${1:-7}"

# ── Load .env (strip Windows line endings) ─────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found at ${ENV_FILE}" >&2
  exit 1
fi
# shellcheck source=/dev/null
source <(sed 's/\r$//' "$ENV_FILE")

DB_PATH="${PROJECT_DIR}/${DATABASE_URL:-data/gandhi-bot.db}"

# ── Pre-flight checks ───────────────────────────────────────────────────────
if [[ ! -f "$DB_PATH" ]]; then
  echo "ERROR: database not found at ${DB_PATH}" >&2
  exit 1
fi
if ! command -v sqlite3 &>/dev/null; then
  echo "ERROR: sqlite3 is not installed. Run: apt-get install -y sqlite3" >&2
  exit 1
fi

# ── Backup ─────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +"%Y%m%d%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/gandhi-bot_${TIMESTAMP}.db"

# SQLite's .backup command performs a safe online backup: it flushes the WAL,
# acquires a shared lock, and copies the file atomically — safe while the bot
# is running, unlike a plain `cp` on a live database.
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

echo "Backup created: ${BACKUP_FILE}"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup created: ${BACKUP_FILE}" >> "$LOG_FILE"

# ── Rotate old backups ──────────────────────────────────────────────────────
if [[ "$MAX_BACKUPS" -gt 0 ]]; then
  mapfile -t ALL_BACKUPS < <(ls -1t "${BACKUP_DIR}"/gandhi-bot_*.db 2>/dev/null)
  EXCESS=$(( ${#ALL_BACKUPS[@]} - MAX_BACKUPS ))
  if [[ "$EXCESS" -gt 0 ]]; then
    for old in "${ALL_BACKUPS[@]:$MAX_BACKUPS}"; do
      rm -f "$old"
      echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup deleted: ${old}" >> "$LOG_FILE"
      echo "Deleted old backup: ${old}"
    done
  fi
fi

echo "Done. ${MAX_BACKUPS} most recent backup(s) kept."
