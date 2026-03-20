import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const headingFont = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FortiCorp | Consultoria Tecnológica e Desenvolvimento de Sistemas",
  description:
    "Consultoria tecnológica, desenvolvimento de software sob medida, automação de processos e sustentação de projetos para empresas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
