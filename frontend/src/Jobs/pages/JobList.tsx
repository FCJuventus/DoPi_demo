import React, { useEffect, useState } from "react";
import { JobsAPI } from "../api"; // проверь путь: если api лежит в другом месте — поправь импорт

type Props = {
  /** Показать только мои задания (созданные мной или где я фрилансер) */
  onlyMine?: boolean;
  /** Текущий пользователь (если нужно фильтровать по uid) */
  currentUser?: any;
};

export default function JobList({ onlyMine = false, currentUser }: Props) {
  const [jobs, setJobs] = useState<any[]>([]);
  const myUid = currentUser?.uid;

  useEffect(() => {
    // Пример: если у тебя уже есть эндпоинт /jobs?onlyMine=true — используй его.
    // Иначе забираем все и фильтруем на клиенте.
    (async () => {
      const all = await JobsAPI.list(); // ожидается метод list() в твоём JobsAPI
      if (onlyMine && myUid) {
        const filtered = all.filter(
          (j: any) => j.creatorUid === myUid || j.freelancerUid === myUid
        );
        setJobs(filtered);
      } else {
        setJobs(all);
      }
    })();
  }, [onlyMine, myUid]);

  if (!jobs.length) {
    return <div style={{ padding: 8 }}>Список пуст</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {jobs.map((j) => (
        <a
          key={j._id}
          href={`#/jobs/${j._id}`}
          style={{
            display: "block",
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 8,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 600 }}>{j.title}</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            Бюджет: {j.budgetPi} π · Статус: {j.status}
          </div>
        </a>
      ))}
    </div>
  );
}
