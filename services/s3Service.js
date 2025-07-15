import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const putObject = async (bucketName, file) => {
  const params = {
    Bucket: bucketName,
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const putCommand = new PutObjectCommand(params);
  await s3.send(putCommand);
};

export const getObject = async (bucketName, key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  const getCommand = new GetObjectCommand(params);
  const url = await getSignedUrl(s3, getCommand);
  return url;
};
