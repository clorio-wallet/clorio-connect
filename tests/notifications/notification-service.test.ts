import { describe, expect, it } from 'vitest';
import {
  getNotificationCopy,
  isNotificationMessage,
  notificationId,
} from '../../src/background/notifications';
import { getNotificationApiUrl } from '../../src/lib/notifications';

describe('notification service', () => {
  it('uses the requested locale and falls back to English', () => {
    expect(getNotificationCopy('es', 'notifications.session.unlocked')).toEqual({
      title: 'Clorio Connect',
      message: 'Tu billetera está desbloqueada.',
    });
    expect(getNotificationCopy('it', 'notifications.session.unlocked')).toEqual(
      getNotificationCopy('en', 'notifications.session.unlocked'),
    );
  });

  it('creates stable scoped notification IDs', () => {
    expect(notificationId('transaction', 'abc')).toBe(
      'clorio_transaction_abc',
    );
  });

  it('does not require a loaded network config to resolve a tracking URL', () => {
    expect(getNotificationApiUrl(undefined)).toBeUndefined();
  });

  it('rejects malformed runtime notification messages', () => {
    expect(isNotificationMessage({ type: 'TRACK_TRANSACTION' })).toBe(false);
    expect(
      isNotificationMessage({
        type: 'SESSION_LOCKED',
      }),
    ).toBe(true);
  });
});
