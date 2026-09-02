const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { StorageService } = require("./storageService");

class GridFSStorageAdapter extends StorageService {
  constructor(config) {
    super();
    this.bucketName = config.bucketName || "fs";
    this.chunkSizeBytes = config.chunkSizeBytes || 255 * 1024;
  }

  _getDb() {
    const conn = mongoose.connection;
    const db = conn.db;
    if (!db) {
      throw new Error("Database connection not available for GridFS");
    }
    return db;
  }

  _getBucket() {
    const db = this._getDb();
    return new GridFSBucket(db, {
      bucketName: this.bucketName,
      chunkSizeBytes: this.chunkSizeBytes,
    });
  }

  _isValidObjectId(id) {
    const { ObjectId } = require("mongodb");
    return ObjectId.isValid(id);
  }

  _toObjectId(id) {
    if (typeof id === "string") {
      const { ObjectId } = require("mongodb");
      if (ObjectId.isValid(id)) {
        return new ObjectId(id);
      }
    }
    return id;
  }

  async uploadFile(fileBuffer, originalName, category = "student", metadata = {}) {
    const bucket = this._getBucket();
    const ext = require("path").extname(originalName) || ".bin";
    const filename = `${category}/${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`;

    const objectId = new mongoose.Types.ObjectId();
    const uploadStream = bucket.openUploadStreamWithId(
      objectId,
      filename,
      {
        contentType: metadata.mimetype,
        metadata: {
          ...metadata,
          category,
          originalName,
        },
      }
    );

    return new Promise((resolve, reject) => {
      uploadStream.on("finish", () => {
        resolve({
          storagePath: uploadStream.id.toString(),
          filename: filename,
          originalName: originalName,
          category: category,
          size: uploadStream.bytesWritten,
          url: null,
        });
      });
      uploadStream.on("error", (err) => {
        reject(err);
      });
      uploadStream.write(fileBuffer);
      uploadStream.end();
    });
  }

  async downloadFile(fileId) {
    const bucket = this._getBucket();
    const db = this._getDb();

    if (!this._isValidObjectId(fileId)) {
      throw new Error(`File not found in GridFS: ${fileId}`);
    }

    const objectId = this._toObjectId(fileId);
    const filesCollection = db.collection(`${this.bucketName}.files`);
    const fileDoc = await filesCollection.findOne({ _id: objectId });

    if (!fileDoc) {
      throw new Error(`File not found in GridFS: ${fileId}`);
    }

    const downloadStream = bucket.openDownloadStream(objectId);
    const metadata = fileDoc.metadata || {};

    return {
      buffer: downloadStream,
      originalName: metadata.originalName || fileDoc.filename || fileId.toString(),
      size: fileDoc.length || 0,
      contentType: fileDoc.contentType || metadata.contentType || "application/octet-stream",
    };
  }

  async getFileUrl(fileId) {
    if (!fileId) return "";
    return `/api/documents/download?fileId=${fileId}`;
  }

  async deleteFile(fileId) {
    const bucket = this._getBucket();

    if (!this._isValidObjectId(fileId)) {
      throw new Error(`Cannot delete file: invalid GridFS fileId: ${fileId}`);
    }

    const objectId = this._toObjectId(fileId);

    return new Promise((resolve, reject) => {
      bucket.delete(objectId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async fileExists(fileId) {
    const bucket = this._getBucket();

    if (!this._isValidObjectId(fileId)) {
      return false;
    }

    const objectId = this._toObjectId(fileId);

    return new Promise((resolve, reject) => {
      bucket.find({ _id: objectId }).toArray((err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files && files.length > 0);
        }
      });
    });
  }
}

module.exports = { GridFSStorageAdapter };