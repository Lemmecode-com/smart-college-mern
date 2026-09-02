const GRIDFS_BUCKET_NAME = process.env.GRIDFS_BUCKET_NAME || "fs";
const GRIDFS_CHUNK_SIZE = parseInt(process.env.GRIDFS_CHUNK_SIZE, 10) || 255 * 1024;

const GRIDFS_CONFIG = {
  bucketName: GRIDFS_BUCKET_NAME,
  chunkSizeBytes: GRIDFS_CHUNK_SIZE,
};

module.exports = {
  STORAGE_PROVIDER: "gridfs",
  GRIDFS_CONFIG,
};
