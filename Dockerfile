FROM node:latest

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
