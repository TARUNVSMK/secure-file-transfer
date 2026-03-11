import { createReadStream } from "node:fs";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { apiConfig } from "../config.js";

let client = null;

export const getClient = () => {
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

const SIGNED_URL_TTL_SECONDS = 60 * 15;

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

export const getSignedUploadUrl = async (objectKey, expiresIn = SIGNED_URL_TTL_SECONDS) =>
  getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: apiConfig.r2.bucketName,
      Key: objectKey,
      ContentType: "application/octet-stream",
    }),
    { expiresIn },
  );

export const getSignedDownloadUrl = async (objectKey, expiresIn = SIGNED_URL_TTL_SECONDS) =>
  getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: apiConfig.r2.bucketName,
      Key: objectKey,
    }),
    { expiresIn },
  );
