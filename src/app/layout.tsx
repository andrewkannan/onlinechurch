import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Church Live Hub | Unified Chat, AI Assistant & Ministry Reports",
  description: "Unified live streaming companion for YouTube and Instagram church broadcasts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
