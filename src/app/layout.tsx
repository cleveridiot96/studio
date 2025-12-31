import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { AppDataProvider } from "@/contexts/AppDataContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kisan Khata Sahayak",
  description: "A modern accounting application for agricultural businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={cn("bg-background font-sans antialiased")}>
        <AppDataProvider>{children}</AppDataProvider>
      </body>
    </html>
  );
}
