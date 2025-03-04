FROM node:latest

# Install sqlite3
RUN apt-get update && apt-get install -y sqlite3

# Set the working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Command to run the start script
RUN chmod +x start.sh
CMD ["./start.sh"]