import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

export const CLIENT_LANGS = ['ar', 'en', 'ur', 'tr'];
export const SALON_LANGS  = ['ar', 'en', 'ur', 'tr'];

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'ar',
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
