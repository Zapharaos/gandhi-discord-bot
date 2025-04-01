#!/bin/bash

# Windows-style line endings (CRLF) to Unix-style line endings (LF)
sed -i 's/\r$//' .env

# Load environment variables from .env file
source .env

# Variables
CONTAINER_NAME="gandhi-discord-bot-bot-1"
DB_PATH_IN_CONTAINER="/app/${DATABASE_URL:-data/gandhi-bot.db}"
BACKUP_DIR="${DATABASE_BACKUPS_PATH:-/var/backups/db}"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_backup_${TIMESTAMP}.db"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Copy the database from the Docker container to the local backup directory
docker cp "${CONTAINER_NAME}:${DB_PATH_IN_CONTAINER}" "${BACKUP_FILE}"

# Check if the backup was successful
if [ $? -eq 0 ]; then
  echo "Backup successful: ${BACKUP_FILE}"
else
  echo "Backup failed"
  exit 1
fi