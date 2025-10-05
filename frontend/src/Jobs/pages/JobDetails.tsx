import React, { useEffect, useState } from "react";
import { JobsAPI, PaymentsAPI } from "../api";
import { useTranslation } from "react-i18next";
import { calcFee } from "../../config";

declare global {
  interface Window {
    Pi: any;
  }
}

/** Берём id из хэша вида "#/jobs/<id>" */
function useHashId() {
  const getIdFromHash = () => window.location.hash.split("/")[2] || "";
  const [id, setId] = useState<string>(getIdFromHash());

  useEffect(() => {
    const onHashChange = () => setId(getIdFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return id;
}

type Props = { currentUser?: any };

export default function JobDetails({ currentUser }: Props) {
  const { t } = useTranslation();
  const id = useHashId();
  const [job, setJob] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      JobsAPI.get(id).then(setJob);
    }
  }, [id]);

  if (!job) return <div>Loading...</div>;

  const isOwner = !!currentUser && job.creatorUid === currentUser.uid;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isFreelancer = !!currentUser && job.freelancerUid === currentUser.uid;

  async function assignSelf() {
    if (!currentUser) return alert("Нужно войти");
    await JobsAPI.award(job._id, currentUser.uid);
    setJob(await JobsAPI.get(id));
  }

  async function pay() {
    if (!window.Pi) return alert("Pi SDK не найден");
    if (!currentUser) return alert("Нужно войти");

    // ✅ Считаем комиссию и отправляем в платёж сумму с комиссией
    const { fee, total } = calcFee(job.budgetPi);

    const paymentData = {
      amount: total, // ВАЖНО: оплачиваем бюджет + комиссия
      memo: `Job ${job.title}`,
      metadata: {
        jobId: job._id,        // связываем платёж с задачей
        budgetPi: job.budgetPi,
        feePi: fee,
        totalPi: total
      }
    };

    await window.Pi.createPayment(paymentData, {
      onReadyForServerApproval: async (paymentId: string) => {
        await PaymentsAPI.approve(paymentId);
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        await PaymentsAPI.complete(paymentId, txid);
      },
      onCancel: async () => {
        // по желанию можно вызвать эндпоинт отмены, если он реализован
        // await PaymentsAPI.cancel(paymentId)
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

  const { fee, total } = calcFee(job.budgetPi);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <h2>{job.title}</h2>
      <div>{job.description}</div>

      <div><b>{t("budgetPi", "Бюджет")}:</b> {job.budgetPi} Test-Pi</div>
      <div><b>{t("platformFee", "Комиссия платформы")}:</b> {fee} Test-Pi</div>
      <div><b>{t("totalToPay", "Итого к оплате")}:</b> {total} Test-Pi</div>

      <div><b>{t("status", "Статус")}:</b> {t(job.status)}</div>
      <div><b>{t("freelancer", "Исполнитель")}:</b> {job.freelancerUid || "-"}</div>

      {!isOwner && !job.freelancerUid && currentUser && (
        <button onClick={assignSelf}>{t("assignFreelancer", "Стать исполнителем")}</button>
      )}

      {isOwner && job.status === "awarded" && (
        <button onClick={pay}>{t("pay", "Оплатить")}</button>
      )}

      {isOwner && job.status === "paid" && (
        <button onClick={complete}>{t("complete", "Завершить")}</button>
      )}

      {isOwner && (job.status === "open" || job.status === "awarded") && (
        <button onClick={cancel}>{t("cancel", "Отменить")}</button>
      )}
    </div>
  );
}
