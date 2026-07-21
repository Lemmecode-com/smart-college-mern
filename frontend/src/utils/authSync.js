const AUTH_EVENT_CHANNEL = "smart-college-auth";

export function broadcastAuthInvalidation(reason = "SESSION_INVALIDATED") {
  const payload = {
    type: "SESSION_INVALIDATED",
    reason,
    timestamp: Date.now(),
  };

  const dataStr = JSON.stringify(payload);

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(AUTH_EVENT_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // Fallback to localStorage
    }
  }

  localStorage.setItem(AUTH_EVENT_CHANNEL, dataStr);
  setTimeout(() => {
    localStorage.removeItem(AUTH_EVENT_CHANNEL);
  }, 100);
}

export function listenForAuthInvalidation(callback) {
  const storageHandler = (event) => {
    if (event.key === AUTH_EVENT_CHANNEL && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        if (data.type === "SESSION_INVALIDATED") {
          callback(data);
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  window.addEventListener("storage", storageHandler);

  let channel = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(AUTH_EVENT_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "SESSION_INVALIDATED") {
          callback(event.data);
        }
      };
    } catch {
      // Fallback: only localStorage
    }
  }

  return () => {
    window.removeEventListener("storage", storageHandler);
    if (channel) {
      channel.close();
    }
  };
}
