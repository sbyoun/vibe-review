export type StorageConfig = {
  provider: "s3_compatible";
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export const storageConfig: StorageConfig = {
  provider: "s3_compatible",
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  bucket: process.env.S3_BUCKET,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
};

export function isStorageConfigured(config: StorageConfig = storageConfig) {
  return Boolean(
    config.endpoint &&
      config.region &&
      config.bucket &&
      config.accessKeyId &&
      config.secretAccessKey,
  );
}
