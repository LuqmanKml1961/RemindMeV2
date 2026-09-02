"use client";

import { useEffect } from "react";

// Catches errors in the root layout itself — must render its own <html>/<body> and its own styles
// since it replaces the root layout and does not include the app's global stylesheet.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#f4f2ec", color: "#121212" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", color: "#d90429" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 14, color: "#636363", maxWidth: 320 }}>
            An unexpected error occurred. Your data is still safe on this device.
          </p>
          <button
            onClick={retry}
            style={{ border: "2px solid #121212", background: "#121212", color: "#f4f2ec", padding: "10px 24px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
