import React from "react";
import { useTranslation } from "react-i18next";

export default function JobCard({ job }: { job: any }) {
  const { t } = useTranslation();
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 10 }}>
      <div><strong>{job.title}</strong></div>
      <div>{job.description}</div>
      <div>{t("budgetPi")}: {job.budgetPi}</div>
      <div>{t("status")}: {t(job.status)}</div>
      <a href={`#/jobs/${job._id}`}>{t("details")}</a>
    </div>
  );
}

