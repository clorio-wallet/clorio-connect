import { afterEach, expect, it, vi } from 'vitest';
import { registerUpdateNotification } from '../src/background/update-notification';

afterEach(() => vi.unstubAllGlobals());

it('shows a localized native notification only after an extension update', async () => {
  let listener: (details: { reason: string }) => void;
  const create = vi.fn().mockResolvedValue('clorio_software_update');
  vi.stubGlobal('chrome', {
    runtime: {
      onInstalled: { addListener: (callback: typeof listener) => { listener = callback; } },
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
    storage: { local: { get: vi.fn().mockResolvedValue({ clorio_language: 'fr-FR' }) } },
    notifications: { create },
    i18n: { getUILanguage: () => 'en-US' },
  });
  registerUpdateNotification();
  listener!({ reason: 'install' });
  listener!({ reason: 'chrome_update' });
  expect(create).not.toHaveBeenCalled();
  listener!({ reason: 'update' });
  await vi.waitFor(() => expect(create).toHaveBeenCalledWith('clorio_software_update', expect.objectContaining({
    type: 'basic', message: 'Clorio Connect a été mis à jour avec succès.',
  })));
});
