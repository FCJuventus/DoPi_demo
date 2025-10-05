import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span>{t("language")}:</span>
      <button onClick={() => i18n.changeLanguage("ru")}>{t("russian")}</button>
      <button onClick={() => i18n.changeLanguage("en")}>{t("english")}</button>
    </div>
  );
}

