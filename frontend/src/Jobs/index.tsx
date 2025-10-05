import React from "react";
import JobList from "./pages/JobList";
import JobCreate from "./pages/JobCreate";
import JobDetails from "./pages/JobDetails";

type Props = {
  currentUser?: any; // пользователь из App
};

export default function Jobs({ currentUser }: Props) {
  const hash = window.location.hash || "";

  let page: React.ReactNode = <JobList />;

  // Маршруты через hash (как у тебя задумано)
  if (hash.startsWith("#/jobs/") && hash !== "#/jobs/new") {
    page = <JobDetails currentUser={currentUser} />;
  } else if (hash === "#/jobs/new") {
    page = <JobCreate />;
  } else if (hash === "#/my") {
    page = <JobList onlyMine />;
  } else {
    page = <JobList />;
  }

  return <>{page}</>;
}
