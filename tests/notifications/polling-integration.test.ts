import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isWalletUiOpen, pollTransactionWatches, registerNotificationHandlers, registerTransactionWatch } from '../../src/background/notifications';

const key = 'clorio_notification_transaction_watches';
const transaction = { hash: 'hash1', address: 'B62address', apiUrl: 'https://api.test', networkId: 'mainnet', type: 'payment' as const };
let storage: Record<string, any>;
let create: ReturnType<typeof vi.fn>;
let listener: any;
let alarmListener: any;
beforeEach(() => {
  storage = {};
  create = vi.fn().mockResolvedValue('notification');
  vi.stubGlobal('chrome', {
    storage: { local: {
      get: vi.fn(async (key: string) => ({ [key]: structuredClone(storage[key]) })),
      set: vi.fn(async (values: object) => { Object.assign(storage, structuredClone(values)); }),
    } },
    runtime: {
      getContexts: vi.fn().mockResolvedValue([]),
      onMessage: { addListener: (fn: any) => { listener = fn; } },
    },
    alarms: {
      get: vi.fn().mockResolvedValue({ name: 'clorio_transaction_notifications' }),
      create: vi.fn().mockResolvedValue(undefined),
      onAlarm: { addListener: (fn: any) => { alarmListener = fn; } },
    },
    notifications: { create, onClicked: { addListener: vi.fn() }, clear: vi.fn() },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('persistent transaction polling', () => {
  it('keeps polling pending and network errors until confirmation, then notifies once', async () => {
    await registerTransactionWatch(transaction);
    const fetcher = vi.fn().mockResolvedValueOnce({ status: 'pending' })
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 'applied' });
    await pollTransactionWatches(fetcher);
    await pollTransactionWatches(fetcher);
    expect(Object.keys(storage[key])).toHaveLength(1);
    expect(create).not.toHaveBeenCalled();
    await pollTransactionWatches(fetcher);
    await pollTransactionWatches(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(1);
    expect(storage[key]).toEqual({});
  });

  it('does not notify again when a stale mempool result rediscovers a delivered transaction', async () => {
    await registerTransactionWatch(transaction);
    const fetcher = vi.fn().mockResolvedValue({ status: 'applied' });
    await pollTransactionWatches(fetcher);
    await registerTransactionWatch(transaction);
    await pollTransactionWatches(fetcher);
    expect(create).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(storage[key]).toEqual({});
  });

  it('retries a missing transaction twice over five minutes and sends one disappearance notification', async () => {
    const clock = vi.spyOn(Date, 'now');
    clock.mockReturnValue(1_000_000);
    try {
      await registerTransactionWatch(transaction);
      const fetcher = vi.fn().mockResolvedValue({ status: 'missing' });
      await pollTransactionWatches(fetcher);
      expect(storage[key]['mainnet:hash1'].missingRetries).toBe(0);
      clock.mockReturnValue(1_060_000);
      await pollTransactionWatches(fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
      clock.mockReturnValue(1_180_000);
      await pollTransactionWatches(fetcher);
      expect(storage[key]['mainnet:hash1'].missingRetries).toBe(1);
      expect(create).not.toHaveBeenCalled();
      clock.mockReturnValue(1_300_000);
      create.mockRejectedValueOnce(new Error('notification unavailable'));
      await pollTransactionWatches(fetcher);
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(storage[key]['mainnet:hash1'].lastStatus).toBe('dropped');
      await pollTransactionWatches(fetcher);
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(create).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ message: expect.stringContaining('two retries over 5 minutes') }));
      expect(storage[key]).toEqual({});
    } finally { clock.mockRestore(); }
  });

  it('resets the disappearance window if the transaction returns and ignores network failures', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      await registerTransactionWatch(transaction);
      const fetcher = vi.fn().mockResolvedValueOnce({ status: 'missing' })
        .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValue({ status: 'applied' });
      await pollTransactionWatches(fetcher);
      clock.mockReturnValue(1_180_000);
      await pollTransactionWatches(fetcher);
      expect(storage[key]['mainnet:hash1'].missingRetries).toBe(0);
      await pollTransactionWatches(fetcher);
      expect(storage[key]['mainnet:hash1'].missingSince).toBeUndefined();
      await pollTransactionWatches(fetcher);
      expect(create).toHaveBeenCalledTimes(1);
      expect(storage[key]).toEqual({});
    } finally { clock.mockRestore(); }
  });

  it('retries failed notification delivery without requiring another API response', async () => {
    await registerTransactionWatch(transaction);
    create.mockRejectedValueOnce(new Error('notification unavailable'));
    const fetcher = vi.fn().mockResolvedValue({ status: 'failed' });
    await pollTransactionWatches(fetcher);
    expect(storage[key]['mainnet:hash1'].lastStatus).toBe('failed');
    await pollTransactionWatches(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
    expect(storage[key]).toEqual({});
  });

  it('coalesces overlapping polls and preserves concurrent registrations', async () => {
    await registerTransactionWatch(transaction);
    let resolve!: (value: { status: 'applied' }) => void;
    const fetcher = vi.fn(() => new Promise<{ status: 'applied' }>(r => { resolve = r; }));
    const first = pollTransactionWatches(fetcher);
    const second = pollTransactionWatches(fetcher);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const registration = registerTransactionWatch({ ...transaction, hash: 'hash2' });
    resolve({ status: 'applied' });
    await Promise.all([first, second, registration]);
    expect(Object.keys(storage[key])).toEqual(['mainnet:hash2']);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('restores persisted watches at startup and polls through the alarm using the real response parser', async () => {
    storage[key] = { 'mainnet:hash1': { ...transaction, lastStatus: 'pending' } };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ data: { status: 'pending' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], mempool: [{ hash: 'hash1' }] }) })
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'applied' }) });
    vi.stubGlobal('fetch', fetchMock);
    registerNotificationHandlers();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(create).not.toHaveBeenCalled();
    alarmListener({ name: 'clorio_transaction_notifications' });
    await vi.waitFor(() => expect(storage[key]).toEqual({}));
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('smart session notifications', () => {
  it.each(['POPUP', 'SIDE_PANEL', 'TAB'])('suppresses lock and unlock with an open %s', async contextType => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([{ contextType } as any]);
    registerNotificationHandlers();
    for (const type of ['SESSION_LOCKED', 'SESSION_UNLOCKED']) {
      await new Promise(resolve => listener({ type }, {}, resolve));
    }
    expect(create).not.toHaveBeenCalled();
  });
  it('notifies when only the background is open', async () => {
    registerNotificationHandlers();
    await new Promise(resolve => listener({ type: 'SESSION_LOCKED' }, {}, resolve));
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('detects Firefox views without counting the background page', async () => {
    (chrome.runtime as any).getContexts = undefined;
    (chrome as any).extension = { getViews: () => [{ location: { pathname: '/src/background.html' } }] };
    expect(await isWalletUiOpen()).toBe(false);
    (chrome as any).extension.getViews = () => [{ location: { pathname: '/src/popup/index.html' } }];
    expect(await isWalletUiOpen()).toBe(true);
  });
});
