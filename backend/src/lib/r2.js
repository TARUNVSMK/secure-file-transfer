import { createReadStream } from "node:fs";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { apiConfig } from "../config.js";

let client = null;

const getClient = () => {
  if (!client) {
    client = new S3Client({
      region: apiConfig.r2.region,
      endpoint: apiConfig.r2.endpointUrl,
      credentials: {
        accessKeyId: apiConfig.r2.accessKeyId,
        secretAccessKey: apiConfig.r2.secretAccessKey,
      },
    });
  }

  return client;
};

export const uploadEncryptedFile = async (filePath, objectKey) => {
  const upload = new Upload({
    client: getClient(),
    params: {
      Bucket: apiConfig.r2.bucketName,
      Key: objectKey,
      Body: createReadStream(filePath),
      ContentType: "application/octet-stream",
    },
  });

  await upload.done();
};

export const getObjectStream = async (objectKey) => {
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: apiConfig.r2.bucketName,
      Key: objectKey,
    }),
  );

  if (!response.Body) {
    throw new Error("Cloudflare R2 returned an empty object body.");
  }

  return response.Body;
};

export const deleteObject = async (objectKey) => {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: apiConfig.r2.bucketName,
      Key: objectKey,
    }),
  );
};
