
import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Kisan Khata Sahayak",
  description: "A modern accounting application for agricultural businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning={true}>
      <body className={cn("bg-background font-sans antialiased", fontSans.variable)}>
        <div className="h-full w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
