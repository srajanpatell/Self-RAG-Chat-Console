import "./globals.css";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Self-RAG Chat",
  description: "Next + Nest + FastAPI + Groq"
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f766e" },
    secondary: { main: "#b45309" },
    background: { default: "#f8fafc", paper: "#ffffff" }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif"
  }
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
