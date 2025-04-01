#!/bin/bash

# Get the directory variables
PROJECT_DIR=$(dirname "$(dirname "$(readlink -f "$0")")")
PATH_ENV_FILE="${PROJECT_DIR}/.env"

# Ensure .env has Unix-style line endings and load the environment variables
sed -i 's/\r$//' "${PATH_ENV_FILE}"
source "${PATH_ENV_FILE}"

# Variables for docker
CONTAINER_NAME="gandhi-discord-bot-bot-1"
DB_PATH_IN_CONTAINER="/app/${DATABASE_URL:-data/gandhi-bot.db}"

# Variables for backup
MAX_BACKUPS=${1:-5}
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="${PROJECT_DIR}/var/db-backups"
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

# Cleanup old backups
if [ "$MAX_BACKUPS" -ne 0 ]; then

  # List all backups, sort newest first, keep only the $MAX_BACKUPS most recent
  ls -1 "${BACKUP_DIR}/database_backup_"*.db | sort -r | head -n $MAX_BACKUPS > /tmp/latest_backups.txt

  # Find files NOT in the latest $MAX_BACKUPS and delete them with logging
  ls -1 "${BACKUP_DIR}/database_backup_"*.db | sort -r | grep -vxFf /tmp/latest_backups.txt | while read -r file; do
      echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup deleted: ${file}" >> "${BACKUP_DIR}/backup.log"
      rm -f "${file}"
  done

  # Remove the temporary file
  rm -f /tmp/latest_backups.txt
fi

# Log the cleanup
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup created: ${BACKUP_FILE}" >> "${BACKUP_DIR}/backup.log"
