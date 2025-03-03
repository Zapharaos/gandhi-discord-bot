FROM node:latest

# Set the working directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application code
COPY . /usr/src/app/

# Run the deploy script with debugging
RUN node deploy-commands.js

# Command to run the application
CMD ["node", "index.js"]