import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import App from "./app/App.tsx";
import HomePage from "./components/landing/HomePage.tsx";
import AboutUsPage from "./pages/AboutUsPage.tsx";
import ExtremeWeatherRisksPage from "./pages/ExtremeWeatherRisksPage.tsx";
import ExtremeWeatherRiskDetailPage from "./pages/ExtremeWeatherRiskDetailPage.tsx";
import ExtremeWeatherQuizPage from "./pages/ExtremeWeatherQuizPage.tsx";
import Map3DExperimentPage from "./pages/Map3DExperimentPage.tsx";
import "./styles/index.css";

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={<HomePage key={location.key} />} />
      <Route path="/map" element={<App mode="view" />} />
      <Route path="/map/compare" element={<App mode="compare" />} />
      <Route path="/map/3d-route" element={<Map3DExperimentPage />} />
      <Route path="/map/3d-experiment" element={<Map3DExperimentPage />} />
      <Route path="/aboutus" element={<AboutUsPage />} />
      <Route path="/extreme-weather-risks" element={<ExtremeWeatherRisksPage />} />
      <Route
        path="/extreme-weather-risks-detail"
        element={<ExtremeWeatherRiskDetailPage />}
      />
      <Route path="/extreme-weather-risks-quiz" element={<ExtremeWeatherQuizPage />} />
    </Routes>
  );
}

function RootRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<RootRouter />);
