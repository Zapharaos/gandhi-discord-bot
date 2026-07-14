# Pin to an LTS release: 'latest' (Node 26+) has no better-sqlite3 prebuilt
# binary and fails to compile it from source.
FROM node:22

# Run in UTC so the day bucketing (stored in UTC) and any local-time rendering
# (formatDate, the heatmap calendar) stay consistent.
ENV TZ=UTC

# Install sqlite3
RUN apt-get update && apt-get install -y sqlite3 chromium

# Set the working directory (monorepo root inside the image)
WORKDIR /app

# Install dependencies workspace-aware: copy the root manifest/lockfile and EVERY
# workspace package.json first (all must be present for `npm ci` to resolve the
# lockfile), so this layer stays cached until a manifest changes.
COPY package*.json ./
COPY packages/core/package.json packages/core/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/web-api/package.json apps/web-api/package.json
RUN npm ci

# Copy the shared TS base config and only the sources this image needs, then
# build core -> bot (not the web-api, whose sources aren't copied here).
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/bot apps/bot
RUN npm run build:core && npm run build:bot

# Command to run the bot (cwd stays /app so dotenv and the data/ path resolve
# against the monorepo root, matching the mounted volumes).
CMD ["node", "--enable-source-maps", "/app/apps/bot/dist/src/index.js"]
