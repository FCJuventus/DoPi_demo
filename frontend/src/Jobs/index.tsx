import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import JobList from "./pages/JobList";
import JobCreate from "./pages/JobCreate";
import JobDetails from "./pages/JobDetails";
import MyJobs from "./pages/MyJobs";
import { AuthAPI } from "./api";

declare global { interface Window { Pi: any; } }

// Роутер на хэшах:
function route() {
  const h = window.location.hash.replace(/^#/, ""); // ← тут заменили
  if (!h || h === "/") return { page: "list" as const };
  if (h === "/create") return { page: "create" as const };
  if (h === "/my") return { page: "my" as const };
  const m = h.match(/^\/jobs\/(.+)$/);
  if (m) return { page: "details" as const, id: m[1] };
  return { page: "list" as const };
}

export default function JobsApp() {
  const [currentUser, setCurrentUser] = useState<any|null>(null);
  const [r, setR] = useState(route());

  useEffect(() => {
    const onHash = () => setR(route());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  async function signIn() {
    if (!window.Pi) return alert("Pi SDK не найден");
    const scopes = ["username", "payments", "wallet_address"];
    window.Pi
      .authenticate(scopes, onIncompletePaymentFound)
      .then(async (authResult: any) => {
        await AuthAPI.signin(authResult);
        setCurrentUser(authResult.user);
      })
      .catch(console.error);
  }

  async function onIncompletePaymentFound(payment: any) {
    console.log("Incomplete payment", payment);
    // Обычно сервер сам дообрабатывает через вебхук /payments/incomplete
  }

  async function signOut() {
    await AuthAPI.signout();
    setCurrentUser(null);
  }

  return (
    <div style={{ padding: 16 }}>
      <Header currentUser={currentUser} onSignIn={signIn} onSignOut={signOut} />
      {r.page === "list" && <JobList />}
      {r.page === "create" && <JobCreate />}
      {r.page === "my" && <MyJobs currentUser={currentUser} />}
      {r.page === "details" && <JobDetails currentUser={currentUser} />}
    </div>
  );
}
