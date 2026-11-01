import { describe, expect, it } from 'vitest';
import { sessionNotificationEvent } from '../../src/lib/notifications';

describe('session notification events', () => {
  it('reports a lock only for an authenticated to unauthenticated transition', () => {
    expect(sessionNotificationEvent(true, false)).toBe('SESSION_LOCKED');
    expect(sessionNotificationEvent(false, false)).toBeNull();
  });

  it('reports an unlock only for an explicit unauthenticated to authenticated transition', () => {
    expect(sessionNotificationEvent(false, true)).toBe('SESSION_UNLOCKED');
    expect(sessionNotificationEvent(true, true)).toBeNull();
  });
});
