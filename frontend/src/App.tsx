// ...твой импорт
import "./defaults.css";

export default function App(){
  // ...твоя логика (i18n, авторизация и т.д.)

  return (
    <>
      <Header
        onLogin={handleLogin}
        onLogout={handleLogout}
        isAuthed={!!currentUser}
        lang={lang}
        setLang={setLang}
      />
      <main className="container">
        <Routes>
          {/* твои роуты */}
        </Routes>
      </main>
    </>
  )
}
