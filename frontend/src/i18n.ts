import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/common.json";
import ru from "./locales/ru/common.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru }
    },
    lng: "ru", // стартуем с русского; можно сохранить выбор в localStorage
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

export default i18n;

