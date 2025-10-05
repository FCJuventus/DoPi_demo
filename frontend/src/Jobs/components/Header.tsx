// frontend/src/Jobs/components/Header.tsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t, i18n } = useTranslation();

  const switchLang = (lng: "ru" | "en") => {
    i18n.changeLanguage(lng);
    // чтобы сохранить язык в адресе (не обязательно):
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lng);
    window.history.replaceState({}, "", url.toString());
  };

  // заглушки под вход/выход
  const handleSignIn = () => {
    window.location.href = "#/signin";
  };
  const handleSignOut = () => {
    fetch("/user/signout", { credentials: "include" }).finally(() => {
      window.location.href = "/";
    });
  };

  return (
    <header className="app-header">
      <div className="container header-inner">
        <a href="/" className="brand">
          DoPi
        </a>

        <nav className="nav">
          <a href="#/" className="nav-link">{t("jobs")}</a>
          <a href="#/my" className="nav-link">{t("myJobs")}</a>
          <a href="#/jobs/new" className="btn btn-primary">{t("postJob")}</a>
        </nav>

        <div className="right">
          <div className="lang">
            <button
              className={`lang-btn ${i18n.language.startsWith("ru") ? "active" : ""}`}
              onClick={() => switchLang("ru")}
            >
              RU
            </button>
            <span className="lang-sep">/</span>
            <button
              className={`lang-btn ${i18n.language.startsWith("en") ? "active" : ""}`}
              onClick={() => switchLang("en")}
            >
              EN
            </button>
          </div>

          <div className="auth">
            <button className="btn btn-outline" onClick={handleSignIn}>
              {t("signIn")}
            </button>
            <button className="btn btn-ghost" onClick={handleSignOut}>
              {t("signOut")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
