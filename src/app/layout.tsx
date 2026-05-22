import type { Metadata } from "next";
import SupportWidget from "@/components/SupportWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "IODO RESET - Protocolo de iodo assistido por dados",
  description: "Aplicativo mobile-first para organizar protocolo de iodo, cofatores, diario, exames e analises educacionais com IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <SupportWidget />
      </body>
    </html>
  );
}
