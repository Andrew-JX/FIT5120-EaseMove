import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import HomePage from "./components/landing/HomePage.tsx";
import { normalizeAppPath } from "./lib/navigation.ts";
import "./styles/index.css";

function isMapPath(pathname: string) {
  return normalizeAppPath(pathname) === "/map";
}

function RootRouter() {
  const [pathname, setPathname] = useState(() => normalizeAppPath(window.location.pathname));
  const [landingEntryId, setLandingEntryId] = useState(0);
  const previousPathRef = useRef(normalizeAppPath(window.location.pathname));

  useEffect(() => {
    const syncPathname = () => {
      setPathname(normalizeAppPath(window.location.pathname));
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      const nextPathname = normalizeAppPath(window.location.pathname);

      setPathname(nextPathname);
      previousPathRef.current = nextPathname;

      if (nextPathname === "/") {
        setLandingEntryId((id) => id + 1);
      }
    };

    window.addEventListener("popstate", syncPathname);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("popstate", syncPathname);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (previousPath !== "/" && pathname === "/") {
      setLandingEntryId((id) => id + 1);
    }

    previousPathRef.current = pathname;
  }, [pathname]);

  if (isMapPath(pathname)) {
    return <App />;
  }

  return <HomePage entryId={landingEntryId} key={`landing-${landingEntryId}`} />;
}

createRoot(document.getElementById("root")!).render(<RootRouter />);
