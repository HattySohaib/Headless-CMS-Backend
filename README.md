# Headless CMS Backend

This is the NodeJS, Express, and MongoDB based backend of the Headless-CMS Project. It has all the schemas, routes, and controllers for the backend.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [Available Scripts](#available-scripts)
- [Dependencies](#dependencies)
- [Environment Variables](#environment-variables)
- [License](#license)

## Introduction

This project is the backend service for a Headless CMS, designed to manage blog content. It is built with NodeJS, Express, and MongoDB.

## Installation

To set up the project locally, follow these steps:

1. Clone the repository:
   ```sh
   git clone https://github.com/HattySohaib/Headless-CMS-Backend.git
   ```

2. Change into the project directory:
   ```sh
   cd Headless-CMS-Backend
   ```

3. Install the dependencies:
   ```sh
   npm install
   ```

4. Create a `.env` file in the root directory and add your environment variables:
   ```env
   PORT=3000
   MONGODB_URI=your-mongodb-uri
   JWT_SECRET=your-jwt-secret
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   S3_BUCKET_NAME=your-s3-bucket-name
   ```

## Usage

To run the project:

```sh
npm start
```

This will start the server using `nodemon` on the port specified in the `.env` file.

## Available Scripts

- `start`: Runs the application with `nodemon`.

## Dependencies

- **@aws-sdk/client-s3**: AWS SDK for S3.
- **@aws-sdk/s3-request-presigner**: AWS SDK for S3 request presigner.
- **bcrypt**: Library for hashing passwords.
- **cors**: Middleware for enabling CORS.
- **dotenv**: Loads environment variables from a `.env` file.
- **express**: Web framework for Node.js.
- **jsonwebtoken**: Library for working with JSON Web Tokens.
- **mongodb**: MongoDB driver for Node.js.
- **mongoose**: MongoDB object modeling tool.
- **multer**: Middleware for handling `multipart/form-data` (file uploads).

## Environment Variables

The following environment variables are required to run the project:

- `PORT`: The port on which the server will run.
- `MONGODB_URI`: The URI for connecting to MongoDB.
- `JWT_SECRET`: Secret key for signing JSON Web Tokens.
- `AWS_ACCESS_KEY_ID`: AWS access key ID.
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key.
- `S3_BUCKET_NAME`: Name of the S3 bucket.

## License

This project is licensed under the ISC License.
