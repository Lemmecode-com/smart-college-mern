// Test setup file for Vitest
// Shared mocks and configuration for frontend tests

// BroadcastChannel mock (used by authSync.js)
if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = class BroadcastChannel {
    static channels = {};
    constructor(name) {
      this.name = name;
      if (!BroadcastChannel.channels[name]) {
        BroadcastChannel.channels[name] = [];
      }
      this._listeners = BroadcastChannel.channels[name];
    }
    postMessage(data) {
      this._listeners.forEach((cb) => cb({ data, type: 'message' }));
    }
    close() {
      this._listeners = [];
    }
    addEventListener(type, listener) {
      this._listeners.push(listener);
    }
    removeEventListener(type, listener) {
      this._listeners = this._listeners.filter((cb) => cb !== listener);
    }
  };
}

// Suppress noisy console.log from interceptor in tests
const originalConsoleLog = console.log;
console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('[AxiosResponseInterceptor]') || msg.includes('[performSessionInvalidation]') || msg.includes('[broadcastAuthInvalidation]') || msg.includes('[listenForAuthInvalidation]')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};
