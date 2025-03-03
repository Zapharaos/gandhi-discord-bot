FROM node:latest

# Set the working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Run the deploy script with debugging
RUN node deploy-commands.js

# Command to run the application
CMD ["node", "index.js"]