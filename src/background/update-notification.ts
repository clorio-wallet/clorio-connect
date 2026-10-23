const messages: Record<string, string> = {
  en: 'Clorio Connect has been updated successfully.',
  es: 'Clorio Connect se ha actualizado correctamente.',
  fr: 'Clorio Connect a été mis à jour avec succès.',
  de: 'Clorio Connect wurde erfolgreich aktualisiert.',
};

export async function notifyExtensionUpdated(): Promise<void> {
  const stored = await chrome.storage.local.get('clorio_language');
  const language = typeof stored.clorio_language === 'string'
    ? stored.clorio_language : chrome.i18n.getUILanguage();
  const locale = language.toLowerCase().split(/[-_]/)[0];
  await chrome.notifications.create('clorio_software_update', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-128.png'),
    title: 'Clorio Connect',
    message: messages[locale] ?? messages.en,
  });
}

export function registerUpdateNotification(): void {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'update') return;
    void notifyExtensionUpdated().catch((error) => {
      console.warn('[notifications] Software update notification failed:', error);
    });
  });
}
