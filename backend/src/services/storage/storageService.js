class StorageService {
  uploadFile() {
    throw new Error("uploadFile() must be implemented by subclass");
  }

  downloadFile() {
    throw new Error("downloadFile() must be implemented by subclass");
  }

  getFileUrl() {
    throw new Error("getFileUrl() must be implemented by subclass");
  }

  deleteFile() {
    throw new Error("deleteFile() must be implemented by subclass");
  }

  fileExists() {
    throw new Error("fileExists() must be implemented by subclass");
  }
}

module.exports = { StorageService };