# Pin to an LTS release: 'latest' (Node 26+) has no better-sqlite3 prebuilt
# binary and fails to compile it from source.
FROM node:22

# Run in UTC so the day bucketing (stored in UTC) and any local-time rendering
# (formatDate, the heatmap calendar) stay consistent.
ENV TZ=UTC

# Install sqlite3
RUN apt-get update && apt-get install -y sqlite3 chromium

# Set the working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

RUN npm run build

# Command to run the start script
CMD ["node", "--enable-source-maps", "/app/dist/src/index.js"]
