import React, { useEffect, useState } from "react";
import Jobs from "./Jobs";
import Header from "./Jobs/components/Header"; // проверь путь, если у тебя другой — поправь

// Твой текущий API-слой может отличаться — оставляю заглушки,
// главное — чтобы был currentUser в состоянии
export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Пример: подхватываем сессию при загрузке приложения
  useEffect(() => {
    // если есть свой эндпоинт — дерни его и положи пользователя
    // setCurrentUser(…)
  }, []);

  const handleLogin = async () => {
    // твоя логика логина
    // setCurrentUser({ uid: "..." })
  };

  const handleLogout = async () => {
    // твоя логика выхода
    setCurrentUser(null);
  };

 return (
  <>
    <Header
      onLogin={handleLogin}
      onLogout={handleLogout}
      isAuthed={!!currentUser}
      currentUser={currentUser}
    />
    <main
      style={{
        maxWidth: 960,
        margin: "16px auto",
        padding: "0 16px",
        display: "grid",
        gap: 16
      }}
    >
      <Jobs currentUser={currentUser || undefined} />
    </main>
  </>
);
}
