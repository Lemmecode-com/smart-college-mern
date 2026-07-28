const { StorageService } = require("./storageService");
const { GridFSStorageAdapter } = require("./gridfsAdapter");
const { StorageProvider, getStorageProvider, resetStorageProvider } = require("./storageProvider");
const config = require("./config");

module.exports = {
  StorageService,
  GridFSStorageAdapter,
  StorageProvider,
  getStorageProvider,
  resetStorageProvider,
  config,
};
