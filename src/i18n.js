import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// اللغات المتاحة لكل واجهة
export const CLIENT_LANGS = ['ar', 'en'];
export const SALON_LANGS  = ['ar', 'en', 'ur', 'tr'];

const savedLang = (() => { try { return localStorage.getItem('dork_lang') || 'ar'; } catch { return 'ar'; } })();

i18n.on('languageChanged', lng => { try { localStorage.setItem('dork_lang', lng); } catch {} });

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: savedLang,
    fallbackLng: 'ar',
    ns: ['common'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
