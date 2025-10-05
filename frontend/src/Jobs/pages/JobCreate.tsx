import React, { useState } from "react";
import { JobsAPI } from "../api";
import { useTranslation } from "react-i18next";

export default function JobCreate() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDesc] = useState("");
  const [budgetPi, setBudget] = useState(1);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await JobsAPI.create({ title, description, budgetPi });
    window.location.hash = "#/";
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 480 }}>
      <label>{t("title")}<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label>{t("description")}<textarea value={description} onChange={e=>setDesc(e.target.value)} /></label>
      <label>{t("budgetPi")}<input type="number" step="0.01" value={budgetPi} onChange={e=>setBudget(Number(e.target.value))} /></label>
      <button type="submit">{t("create")}</button>
    </form>
  );
}

