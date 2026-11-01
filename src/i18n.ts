import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

const LANGUAGE_STORAGE_KEY = 'clorio_language';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      es: {
        translation: es,
      },
      fr: {
        translation: fr,
      },
      de: {
        translation: de,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    supportedLngs: ['en', 'es', 'fr', 'de'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
  });

function syncNotificationLanguage(language: string): void {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  void chrome.storage.local.set({
    [LANGUAGE_STORAGE_KEY]: language.split('-')[0],
  });
}

i18n.on('languageChanged', syncNotificationLanguage);
syncNotificationLanguage(i18n.language);

export default i18n;
