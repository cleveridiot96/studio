
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
  description: "Your smart agricultural accounting assistant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning={true}>
      <body 
        className={cn("h-full w-full bg-background font-sans antialiased", fontSans.variable)}
        suppressHydrationWarning={true} 
      >
        {/* The main div here will allow content to scroll if it exceeds viewport height */}
        {/* It effectively becomes the scroll container if SettingsProvider/AppLayout don't manage height explicitly */}
        {children}
      </body>
    </html>
  );
}
