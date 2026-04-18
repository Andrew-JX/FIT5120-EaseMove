
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import HomePage from "./components/landing/HomePage.tsx";
import "./styles/index.css";

const path = window.location.pathname;
const Root = path === "/map" || path === "/map/" ? App : HomePage;

createRoot(document.getElementById("root")!).render(<Root />);
