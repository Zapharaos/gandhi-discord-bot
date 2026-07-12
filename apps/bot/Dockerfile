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

# Install dependencies workspace-aware: copy the root manifest/lockfile and every
# workspace package.json first, so `npm ci` can resolve the whole workspace graph
# and this layer stays cached until a manifest changes.
COPY package*.json ./
COPY packages/core/package.json packages/core/package.json
COPY apps/bot/package.json apps/bot/package.json
RUN npm ci

# Copy the shared TS base config and the workspace sources, then build core -> bot.
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/bot apps/bot
RUN npm run build

# Command to run the bot (cwd stays /app so dotenv and the data/ path resolve
# against the monorepo root, matching the mounted volumes).
CMD ["node", "--enable-source-maps", "/app/apps/bot/dist/src/index.js"]
