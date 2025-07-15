FROM node:22
# Use the official Node.js 22 image as the base image
# Set the working directory inside the container
WORKDIR /app
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
# Install the dependencies defined in package.json
RUN npm install
# Copy the rest of the application code to the working directory
COPY . .
# Expose the port the app runs on
EXPOSE 5000
# Command to run the application
CMD ["node", "app.js"]
# Use node to start the server