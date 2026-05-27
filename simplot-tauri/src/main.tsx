import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

try {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<pre style="margin:24px;color:#b91c1c;white-space:pre-wrap;">${String(
      error,
    )}</pre>`;
  }
}
