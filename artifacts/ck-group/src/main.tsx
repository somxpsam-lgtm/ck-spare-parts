import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, getTheme } from "./lib/prefs";

// Apply the saved theme before first paint so the user's choice persists
// across reloads / app restarts (no flash of the wrong theme).
applyTheme(getTheme());

createRoot(document.getElementById("root")!).render(<App />);
