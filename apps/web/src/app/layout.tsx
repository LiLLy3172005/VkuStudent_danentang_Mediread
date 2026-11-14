import type { Metadata } from "next";
import "./globals.css";
import { ElderlyPreferencesProvider } from "../components/ElderlyPreferencesContext";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "MediRead AI — Trợ lý Y khoa Thông minh cho Người cao tuổi",
  description: "Hệ thống hỗ trợ số hóa, đọc hiểu và quản lý phiếu xét nghiệm, đơn thuốc bằng OCR và AI an toàn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-[#F8FAFA] text-[#14283A]">
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
