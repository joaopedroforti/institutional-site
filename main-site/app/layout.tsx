import type { Metadata } from "next";
import MetaPixelProvider from "./components/meta-pixel-provider";
import "./globals.css";

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
    <html lang="pt-BR">
      <body>
        <MetaPixelProvider />
        {children}
      </body>
    </html>
  );
}
