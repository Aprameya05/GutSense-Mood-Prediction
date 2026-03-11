import type { Metadata } from "next";
import "./globals.css";
import { BioSenseProvider } from "@/context/BioSenseContext";

export const metadata: Metadata = {
  title: "BioSense AI",
  description: "Bio-AI Intelligence System for gut, brain, and metabolism.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="biosense-gradient-bg">
        <BioSenseProvider>{children}</BioSenseProvider>
      </body>
    </html>
  );
}

