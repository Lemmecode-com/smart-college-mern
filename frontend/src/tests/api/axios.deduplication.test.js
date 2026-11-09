import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api, { resetAuthInvalidationGuard } from '../../api/axios';

vi.mock('../../utils/authSync', () => ({
  broadcastAuthInvalidation: vi.fn(),
  listenForAuthInvalidation: vi.fn(() => () => {}),
}));

import { broadcastAuthInvalidation } from '../../utils/authSync';

describe('Axios interceptor 401 deduplication', () => {
  let mock;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthInvalidationGuard();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
    resetAuthInvalidationGuard();
  });

  it('should broadcast once for a single 401', async () => {
    mock.onGet('/test').reply(401, {
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    });

    try {
      await api.get('/test');
    } catch {
      // Expected: the interceptor rejects
    }

    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);
    expect(broadcastAuthInvalidation).toHaveBeenCalledWith('TOKEN_EXPIRED');
  });

  it('should broadcast only once for five simultaneous 401 responses', async () => {
    const make401 = () => ({
      error: { code: 'SESSION_INVALIDATED', message: 'Session invalidated' },
    });

    mock.onGet('/api1').reply(401, make401());
    mock.onGet('/api2').reply(401, make401());
    mock.onGet('/api3').reply(401, make401());
    mock.onGet('/api4').reply(401, make401());
    mock.onGet('/api5').reply(401, make401());

    const promises = [
      api.get('/api1').catch(() => {}),
      api.get('/api2').catch(() => {}),
      api.get('/api3').catch(() => {}),
      api.get('/api4').catch(() => {}),
      api.get('/api5').catch(() => {}),
    ];

    await Promise.all(promises);

    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);
    expect(broadcastAuthInvalidation).toHaveBeenCalledWith('SESSION_INVALIDATED');
  });

  it('should broadcast again after guard reset (sequential session-expiry events)', async () => {
    mock.onGet('/test').reply(401, {
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    });

    try {
      await api.get('/test');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);

    resetAuthInvalidationGuard();

    try {
      await api.get('/test');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(2);
  });

  it('should auto-reset guard via safety timeout', async () => {
    vi.useFakeTimers();

    mock.onGet('/test').reply(401, {
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    });

    try {
      await api.get('/test');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);

    // Second broadcast should be deduplicated while guard is active
    try {
      await api.get('/test');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);

    // Advance past the safety timeout (30 seconds)
    vi.advanceTimersByTime(31000);

    // After timeout, the guard should be cleared and broadcast should fire again
    try {
      await api.get('/test');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('should NOT suppress non-auth error codes', async () => {
    mock.onGet('/test').reply(401, {
      error: { code: 'INVALID_CREDENTIALS', message: 'Bad credentials' },
    });

    try {
      await api.get('/test');
    } catch {
      // Expected
    }

    expect(broadcastAuthInvalidation).not.toHaveBeenCalled();
  });

  it('should NOT broadcast for logout requests (_skipAuthBroadcast)', async () => {
    mock.onPost('/auth/logout').reply(401, {
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    });

    try {
      await api.post('/auth/logout');
    } catch {
      // Expected
    }

    expect(broadcastAuthInvalidation).not.toHaveBeenCalled();
  });

  it('should NOT broadcast for successful (2xx) responses', async () => {
    mock.onGet('/test').reply(200, { success: true, data: {} });

    await api.get('/test');

    expect(broadcastAuthInvalidation).not.toHaveBeenCalled();
  });

  it('should NOT deduplicate 401 with no auth error code', async () => {
    // A 401 without a recognized auth error code should not set the guard
    mock.onGet('/test').reply(401, { message: 'Unauthorized' });

    try {
      await api.get('/test');
    } catch {
      // Expected
    }

    expect(broadcastAuthInvalidation).not.toHaveBeenCalled();
  });

  it('should handle different auth error codes in sequence after reset', async () => {
    mock.onGet('/test1').reply(401, {
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    });
    mock.onGet('/test2').reply(401, {
      error: { code: 'SESSION_TERMINATED', message: 'Session terminated' },
    });

    // First 401
    try {
      await api.get('/test1');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);
    expect(broadcastAuthInvalidation).toHaveBeenCalledWith('TOKEN_EXPIRED');

    // Guard prevents second while in-flight
    try {
      await api.get('/test2');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(1);

    // After reset, second error code is handled
    resetAuthInvalidationGuard();
    try {
      await api.get('/test2');
    } catch {
      // Expected
    }
    expect(broadcastAuthInvalidation).toHaveBeenCalledTimes(2);
    expect(broadcastAuthInvalidation).toHaveBeenCalledWith('SESSION_TERMINATED');
  });
});
