import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { OfflineProvider } from "@/components/providers/OfflineProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PoultryOS - Farm Management System",
  description: "Multi-tenant poultry farm management SaaS platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PoultryOS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#22C55E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <OfflineProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
