import { describe, expect, it } from 'vitest';
import { shouldNotifyForInstallReason } from '../../src/background/notifications';

describe('software update notifications', () => {
  it('notifies only for extension updates', () => {
    expect(shouldNotifyForInstallReason('update')).toBe(true);
    expect(shouldNotifyForInstallReason('install')).toBe(false);
    expect(shouldNotifyForInstallReason('chrome_update')).toBe(false);
  });
});
