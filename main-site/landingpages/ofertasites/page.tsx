import type { Metadata } from "next";
import SitesLandingClient from "../../app/sites/sites-landing-client";
import { withMainSiteUrl } from "../../app/lib/runtime-config";
import "./page.css";

const canonicalPath = "/lp-ofertasites";
const canonicalUrl = withMainSiteUrl(canonicalPath);

export const metadata: Metadata = {
  title: "Criacao de Sites Profissionais | Landing Pages, E-commerce e Sistemas | FortiCorp",
  description:
    "Empresa de criacao de sites e desenvolvimento web: sites profissionais, landing pages, e-commerce e sistemas com foco em SEO, performance e conversao.",
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: "Criacao de Sites Profissionais que Geram Resultados",
    description:
      "Solicite uma proposta para criacao de site profissional, landing page, e-commerce ou sistema sob medida com estrategia comercial e SEO.",
    type: "website",
    url: canonicalUrl,
    siteName: "FortiCorp",
  },
  twitter: {
    card: "summary_large_image",
    title: "Criacao de Sites Profissionais | FortiCorp",
    description:
      "Desenvolvimento de sites profissionais, landing pages e solucoes digitais para empresas que buscam resultados reais.",
  },
};

export default function OfertaSitesLandingPage() {
  return <SitesLandingClient />;
}
