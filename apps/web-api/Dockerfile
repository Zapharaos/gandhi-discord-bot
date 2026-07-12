# Pin to an LTS release: 'latest' (Node 26+) has no better-sqlite3 prebuilt
# binary and fails to compile it from source.
FROM node:22

# Run in UTC so any date bucketing stays consistent with the bot.
ENV TZ=UTC

WORKDIR /app

# NOTE: NODE_ENV is intentionally NOT set to "production" here. Doing so makes
# `npm ci` omit devDependencies (typescript, @types/*), which the build needs.
# The running container gets NODE_ENV=production from docker-compose instead.

# Install workspace-aware. All workspace manifests must be present for `npm ci`
# to resolve the lockfile, even though this image only builds core + web-api.
COPY package*.json ./
COPY packages/core/package.json packages/core/package.json
COPY apps/web-api/package.json apps/web-api/package.json
COPY apps/bot/package.json apps/bot/package.json
RUN npm ci

# Copy only what the web service needs, then build core -> web-api.
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/web-api apps/web-api
RUN npm run build:core && npm run build:web

# Now safe to mark the runtime as production (build is done).
ENV NODE_ENV=production

# cwd stays /app so the read-only DATABASE_URL path resolves against the mounted
# data volume, matching the bot.
CMD ["node", "--enable-source-maps", "/app/apps/web-api/dist/index.js"]
