// frontend/src/Jobs/index.tsx
import React from "react";
import Header from "./components/Header";
import JobList from "./pages/JobList";
import JobDetails from "./pages/JobDetails";
import JobCreate from "./pages/JobCreate";
import MyJobs from "./pages/MyJobs";

export default function JobsApp() {
  // ВАЖНО: используем window.location, чтобы не ругался ESLint на 'location'
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const hash = window.location.hash;

  let page: React.ReactNode = null;

  // Маршруты через hash (как у тебя и сделано)
  if (hash.startsWith("#/jobs/") && hash !== "#/jobs/new") {
  page = <JobDetails currentUser={currentUser} />;
  } else if (hash === "#/jobs/new") {
    page = <JobCreate />;
  } else if (hash === "#/my") {
    page = <MyJobs currentUser={currentUser} />;
  } else {
    page = <JobList currentUser={currentUser} />;
  }

  return (
    <>
      <Header />
      <main className="container">
        {page}
      </main>
    </>
  );
}
