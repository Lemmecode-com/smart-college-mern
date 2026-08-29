const AUTH_EVENT_CHANNEL = "smart-college-auth";

let broadcastCallCount = 0;

let sameTabCallback = null;

export function broadcastAuthInvalidation(reason = "SESSION_INVALIDATED") {
  broadcastCallCount++;
  const now = new Date().toISOString();
  const payload = {
    type: "SESSION_INVALIDATED",
    reason,
    timestamp: Date.now(),
  };

  console.log(
    `[broadcastAuthInvalidation] Time=${now} | Reason=${reason} | CallCount=${broadcastCallCount} | Payload=${JSON.stringify(payload)}`
  );

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

  try {
    localStorage.setItem(AUTH_EVENT_CHANNEL, dataStr);
    setTimeout(() => {
      try {
        localStorage.removeItem(AUTH_EVENT_CHANNEL);
      } catch {
        // Ignore cleanup errors
      }
    }, 100);
  } catch (localStorageError) {
    console.error(
      `[broadcastAuthInvalidation] Time=${now} | localStorageError=${localStorageError.message}`
    );
  }

  if (sameTabCallback) {
    sameTabCallback(payload);
  }
}

export function listenForAuthInvalidation(callback) {
  const prevCallback = sameTabCallback;
  sameTabCallback = callback;

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
    if (sameTabCallback === callback) {
      sameTabCallback = prevCallback;
    }
  };
}
