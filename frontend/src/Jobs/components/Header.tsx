import React from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

type Props = {
  currentUser: any;
  onSignIn: () => void;
  onSignOut: () => void;
};

export default function Header({ currentUser, onSignIn, onSignOut }: Props) {
  const { t } = useTranslation();

  return (
    <header style={{ display: "flex", gap: 16, alignItems: "center", padding: 12 }}>
      <strong>{t("appName")}</strong>
      <a href="#/">{t("jobs")}</a>
      <a href="#/my">{t("myJobs")}</a>
      <a href="#/create">{t("createJob")}</a>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        <LanguageSwitcher />
        {currentUser ? (
          <button onClick={onSignOut}>{t("signOut")}</button>
        ) : (
          <button onClick={onSignIn}>{t("signIn")}</button>
        )}
      </div>
    </header>
  );
}

