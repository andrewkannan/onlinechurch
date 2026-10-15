import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Church Live Hub | Broadcast Control, Pre-Flight QC & Ministry Intelligence",
  description:
    "Unified live streaming broadcast console, pre-flight verification, and audience analytics for YouTube and Instagram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 antialiased selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
