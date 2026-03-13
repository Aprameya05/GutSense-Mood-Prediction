import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import EcgHeader from "@/components/layout/EcgHeader";
import { Toaster } from "sonner";
import DemoButton from "@/components/shared/DemoButton";

export const metadata: Metadata = {
  title: "GutSense — Precision Nutrition Intelligence",
  description: "10-stage AI pipeline for food-gut-mood-neurology analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-jakarta antialiased">
        <Sidebar />
        <div className="ml-[240px] min-h-screen flex flex-col">
          <EcgHeader />
          <main className="flex-1 px-8 py-6">{children}</main>
        </div>
        <DemoButton />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
