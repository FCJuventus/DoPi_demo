import React, { useEffect, useState } from "react";
import { JobsAPI } from "../api";
import JobCard from "../components/JobCard";
import { useTranslation } from "react-i18next";

export default function MyJobs({ currentUser }: { currentUser: any }) {
  const { t } = useTranslation();
  const [asCustomer, setAsCustomer] = useState<any[]>([]);
  const [asFreelancer, setAsFreelancer] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    JobsAPI.list(`?creatorUid=${currentUser.uid}`).then(d => setAsCustomer(d.items || d));
    JobsAPI.list(`?freelancerUid=${currentUser.uid}`).then(d => setAsFreelancer(d.items || d));
  }, [currentUser]);

  if (!currentUser) return <div>Нужно войти</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h3>Как заказчик</h3>
        {asCustomer.length ? asCustomer.map(j => <JobCard key={j._id} job={j} />) : <div>{t("noJobs")}</div>}
      </div>
      <div>
        <h3>Как исполнитель</h3>
        {asFreelancer.length ? asFreelancer.map(j => <JobCard key={j._id} job={j} />) : <div>{t("noJobs")}</div>}
      </div>
    </div>
  );
}

