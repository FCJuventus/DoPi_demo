import React, { useEffect, useState } from "react";
import JobList from "./pages/JobList";
import JobCreate from "./pages/JobCreate";
import JobDetails from "./pages/JobDetails";

type Props = {
  currentUser?: any; // пользователь из App
};

// Хук: следим за window.location.hash
function useHash(): string {
  const getHash = () => window.location.hash || "";
  const [hash, setHash] = useState<string>(getHash);

  useEffect(() => {
    const onHashChange = () => setHash(getHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return hash;
}

export default function Jobs({ currentUser }: Props) {
  const hash = useHash();

  let page: React.ReactNode = <JobList />;

  // Маршруты через hash (как у тебя задумано)
  if (hash.startsWith("#/jobs/") && hash !== "#/jobs/new") {
    page = <JobDetails currentUser={currentUser} />;
  } else if (hash === "#/jobs/new") {
    page = <JobCreate />;
  } else if (hash === "#/my") {
    page = <JobList onlyMine currentUser={currentUser} />;
  } else {
    page = <JobList currentUser={currentUser} />;
  }

  return <>{page}</>;
}
