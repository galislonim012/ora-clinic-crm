import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "אורה CRM", template: "%s · אורה CRM" },
  description: "מערכת ניהול לקוחות, תורים וקריאות שירות לקליניקת אורה",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#fbf8f5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          dir="rtl"
          position="top-center"
          duration={3000}
          toastOptions={{ style: { fontFamily: "var(--font-heebo)", fontSize: 15 } }}
          richColors
        />
      </body>
    </html>
  );
}
