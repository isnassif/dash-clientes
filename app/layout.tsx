import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "N1 Company — Calendário de Conteúdo",
  description: "Calendário de conteúdo para Instagram da N1 Company",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-background text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
