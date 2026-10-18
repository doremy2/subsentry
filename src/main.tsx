import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppProvider } from "./state/AppProvider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
