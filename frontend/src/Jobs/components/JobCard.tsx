// frontend/src/Jobs/components/JobCard.tsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function JobCard({ job }: { job: any }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8 }}>
        <strong style={{ fontSize:16 }}>{job.title}</strong>
        <span style={{ opacity:.8 }}>{t("budgetPi")}: {job.budgetPi}</span>
      </div>
      <div style={{ color:"#9aa3b2", margin:"6px 0 10px" }}>{job.description}</div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span>{t("status")}: {t(job.status)}</span>
        <a className="btn btn-outline" href={`#/jobs/${job._id}`}>{t("details")}</a>
      </div>
    </div>
  );
}
