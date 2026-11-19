import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ElderlyPreferencesProvider } from "../components/ElderlyPreferencesContext";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B6B73",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "MediRead AI — Trợ lý Y khoa Thông minh cho Người cao tuổi",
  description: "Hệ thống hỗ trợ số hóa, đọc hiểu và quản lý phiếu xét nghiệm, đơn thuốc bằng OCR và AI an toàn.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MediRead AI",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${beVietnamPro.className} font-sans min-h-screen flex flex-col bg-[#F8FAFA] text-[#14283A]`}
      >
        <ElderlyPreferencesProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </ElderlyPreferencesProvider>
      </body>
    </html>
  );
}
