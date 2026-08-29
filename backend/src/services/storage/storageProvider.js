const { GridFSStorageAdapter } = require("./gridfsAdapter");
const config = require("./config");

class StorageProvider {
  constructor() {
    this.adapter = new GridFSStorageAdapter(config.GRIDFS_CONFIG);
    this.provider = "gridfs";
  }

  getAdapter() {
    if (!this.adapter) {
      throw new Error("Storage adapter not initialized");
    }
    return this.adapter;
  }

  getProviderName() {
    return this.provider;
  }
}

let storageProviderInstance = null;

function getStorageProvider() {
  if (!storageProviderInstance) {
    storageProviderInstance = new StorageProvider();
  }
  return storageProviderInstance;
}

function resetStorageProvider() {
  storageProviderInstance = null;
}

module.exports = {
  StorageProvider,
  getStorageProvider,
  resetStorageProvider,
};
