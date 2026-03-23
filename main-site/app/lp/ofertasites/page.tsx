import type { Metadata } from "next";
import SitesLandingClient from "../../sites/sites-landing-client";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Criação de Sites Profissionais | Landing Pages, E-commerce e Sistemas | FortiCorp",
  description:
    "Empresa de criação de sites e desenvolvimento web: sites profissionais, landing pages, e-commerce e sistemas com foco em SEO, performance e conversão.",
  alternates: {
    canonical: `${baseUrl}/lp/ofertasites`,
  },
  openGraph: {
    title: "Criação de Sites Profissionais que Geram Resultados",
    description:
      "Solicite uma proposta para criação de site profissional, landing page, e-commerce ou sistema sob medida com estratégia comercial e SEO.",
    type: "website",
    url: `${baseUrl}/lp/ofertasites`,
    siteName: "FortiCorp",
  },
  twitter: {
    card: "summary_large_image",
    title: "Criação de Sites Profissionais | FortiCorp",
    description:
      "Desenvolvimento de sites profissionais, landing pages e soluções digitais para empresas que buscam resultados reais.",
  },
};

export default function OfertaSitesPage() {
  return <SitesLandingClient />;
}
