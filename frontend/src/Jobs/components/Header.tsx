import React from "react";

type HeaderProps = {
  onLogin: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  isAuthed: boolean;
  currentUser?: any;
};

export default function Header({ onLogin, onLogout, isAuthed, currentUser }: HeaderProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#0f172a", // тёмный синий
        color: "white",
        padding: "12px 16px",
        borderBottom: "1px solid #1f2937",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 700, letterSpacing: 0.4 }}>DoPi</span>
        <nav style={{ display: "flex", gap: 8 }}>
          <a href="#/" style={{ color: "white", textDecoration: "none", opacity: 0.9 }}>Задания</a>
          <a href="#/my" style={{ color: "white", textDecoration: "none", opacity: 0.9 }}>Мои</a>
          <a href="#/jobs/new" style={{ color: "white", textDecoration: "none", opacity: 0.9 }}>Новое задание</a>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isAuthed ? (
          <>
            <span style={{ opacity: 0.9 }}>
              {currentUser?.username || currentUser?.uid || "Профиль"}
            </span>
            <button
              onClick={() => onLogout()}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#111827",
                color: "white",
                cursor: "pointer"
              }}
            >
              Выйти
            </button>
          </>
        ) : (
          <button
            onClick={() => onLogin()}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #22c55e",
              background: "#16a34a",
              color: "white",
              cursor: "pointer"
            }}
          >
            Войти с Pi
          </button>
        )}
      </div>
    </header>
  );
}
