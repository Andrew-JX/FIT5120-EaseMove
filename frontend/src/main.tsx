import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import HomePage from "./components/landing/HomePage.tsx";
import "./styles/index.css";

function isMapPath(pathname: string) {
  return pathname === "/map" || pathname === "/map/";
}

function isLandingPath(pathname: string) {
  return !isMapPath(pathname);
}

function RootRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [landingEntryId, setLandingEntryId] = useState(0);
  const previousIsLandingRef = useRef(isLandingPath(window.location.pathname));

  useEffect(() => {
    const syncPathname = () => {
      setPathname(window.location.pathname);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      const nextPathname = window.location.pathname;
      const nextIsLanding = isLandingPath(nextPathname);

      setPathname(nextPathname);
      previousIsLandingRef.current = nextIsLanding;

      if (nextIsLanding) {
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
    const nextIsLanding = isLandingPath(pathname);

    if (!previousIsLandingRef.current && nextIsLanding) {
      setLandingEntryId((id) => id + 1);
    }

    previousIsLandingRef.current = nextIsLanding;
  }, [pathname]);

  if (isMapPath(pathname)) {
    return <App />;
  }

  return <HomePage entryId={landingEntryId} key={`landing-${landingEntryId}`} />;
}

createRoot(document.getElementById("root")!).render(<RootRouter />);
