import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../public/locales/ar/common.json';
import en from '../public/locales/en/common.json';
import tr from '../public/locales/tr/common.json';
import ur from '../public/locales/ur/common.json';

export const CLIENT_LANGS = ['ar', 'en', 'ur', 'tr'];
export const SALON_LANGS  = ['ar', 'en', 'ur', 'tr'];

i18n
  .use(initReactI18next)
  .init({
    lng: 'ar',
    fallbackLng: 'ar',
    ns: ['common'],
    defaultNS: 'common',
    initImmediate: false,
    resources: {
      ar: { common: ar },
      en: { common: en },
      tr: { common: tr },
      ur: { common: ur },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
