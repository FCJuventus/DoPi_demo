import React, { useEffect, useState } from "react";
import { JobsAPI } from "../api";
import JobCard from "../components/JobCard";
import { useTranslation } from "react-i18next";

export default function JobList() {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    JobsAPI.list("?status=open").then(d => setItems(d.items || d)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!items.length) return <div>{t("noJobs")}</div>;

  return <div>{items.map(j => <JobCard key={j._id} job={j} />)}</div>;
}

