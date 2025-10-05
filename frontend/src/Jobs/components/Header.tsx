import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  onLogin: () => void;
  onLogout: () => void;
  isAuthed: boolean;
  lang: "ru" | "en";
  setLang: (l:"ru"|"en") => void;
}

export default function Header({
  onLogin, onLogout, isAuthed, lang, setLang
}: HeaderProps){
  const { t } = useTranslation();

  return (
    <header className="appbar">
      <div className="appbar-inner">
        <div className="brand">{t("appName","DoPi Фриланс")}</div>

        <nav className="nav">
          <NavLink to="/" end className={({isActive})=>isActive?"active":""}>{t("jobs.all","Задачи")}</NavLink>
          <NavLink to="/my" className={({isActive})=>isActive?"active":""}>{t("jobs.mine","Мои задачи")}</NavLink>
          <NavLink to="/create" className={({isActive})=>isActive?"active":""}>{t("jobs.create","Создать задачу")}</NavLink>
        </nav>

        <div className="nav">
          <div className="lang">
            <span className="muted">{t("lang","Язык")}:</span>
            <button className={lang==="ru"?"active":""} onClick={()=>setLang("ru")}>Русский</button>
            <button className={lang==="en"?"active":""} onClick={()=>setLang("en")}>English</button>
          </div>

          {!isAuthed ? (
            <button className="btn secondary" onClick={onLogin}>{t("auth.signin","Войти")}</button>
          ) : (
            <button className="btn ghost" onClick={onLogout}>{t("auth.signout","Выйти")}</button>
          )}
        </div>
      </div>
    </header>
  );
}
