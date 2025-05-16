
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={cn("h-full w-full bg-gray-50", fontSans.variable)}>
        <div className="flex flex-col min-h-screen">
          <header className="h-16 bg-white shadow z-10 sticky top-0">
            {/* Your Header Component */}
          </header>

          <main className="flex-1 overflow-auto px-4 py-6">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>

          <footer className="h-12 bg-white border-t text-center text-xs py-2 text-gray-500">
            {/* Footer if needed */}
          </footer>
        </div>
      </body>
    </html>
  );
}

