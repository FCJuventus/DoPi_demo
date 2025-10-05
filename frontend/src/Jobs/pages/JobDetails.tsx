import React, { useEffect, useState } from "react";
import { JobsAPI, PaymentsAPI } from "../api";
import { useTranslation } from "react-i18next";

declare global {
  interface Window { Pi: any; }
}

function useHashId() {
  const [id, setId] = useState<string>(() => location.hash.split("/")[2] || "");
  useEffect(() => {
    const h = () => setId(location.hash.split("/")[2] || "");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return id;
}

export default function JobDetails({ currentUser }: { currentUser: any }) {
  const { t } = useTranslation();
  const id = useHashId();
  const [job, setJob] = useState<any|null>(null);

  useEffect(() => {
    if (id) JobsAPI.get(id).then(setJob);
  }, [id]);

  if (!job) return <div>Loading...</div>;

  const isOwner = currentUser && job.creatorUid === currentUser.uid;
  const isFreelancer = currentUser && job.freelancerUid === currentUser.uid;

  async function assignSelf() {
    if (!currentUser) return alert("Нужно войти");
    await JobsAPI.award(job._id, currentUser.uid);
    setJob(await JobsAPI.get(id));
  }

  async function pay() {
    if (!window.Pi) return alert("Pi SDK не найден");
    if (!currentUser) return alert("Нужно войти");

    const paymentData = {
      amount: job.budgetPi,
      memo: `Job ${job.title}`,
      metadata: { jobId: job._id }, // ВАЖНО: связываем платёж с задачей
    };

    await window.Pi.createPayment(paymentData, {
      onReadyForServerApproval: async (paymentId: string) => {
        // сервер создаст/зарезервирует заказ
        await PaymentsAPI.approve(paymentId);
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        // сервер отметит завершение
        await PaymentsAPI.complete(paymentId, txid);
      },
      onCancel: async () => {
        // опционально: ничего
      },
      onError: async (err: any) => {
        console.error(err);
        alert("Ошибка оплаты");
      }
    });
  }

  async function complete() {
    await JobsAPI.complete(job._id);
    setJob(await JobsAPI.get(id));
  }

  async function cancel() {
    await JobsAPI.cancel(job._id);
    setJob(await JobsAPI.get(id));
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h2>{job.title}</h2>
      <div>{job.description}</div>
      <div>{t("budgetPi")}: {job.budgetPi}</div>
      <div>{t("status")}: {t(job.status)}</div>
      <div>{t("freelancer")}: {job.freelancerUid || "-"}</div>

      {!isOwner && !job.freelancerUid && currentUser && (
        <button onClick={assignSelf}>{t("assignFreelancer")}</button>
      )}

      {isOwner && job.status === "awarded" && (
        <button onClick={pay}>{t("pay")}</button>
      )}

      {isOwner && job.status === "paid" && (
        <button onClick={complete}>{t("complete")}</button>
      )}

      {isOwner && (job.status === "open" || job.status === "awarded") && (
        <button onClick={cancel}>{t("cancel")}</button>
      )}
    </div>
  );
}

