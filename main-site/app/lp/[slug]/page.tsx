import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

type LandingProxyPageProps = {
  params: Promise<{ slug: string }>;
};

async function getLandingPageSlugs(): Promise<string[]> {
  const landingPagesDir = path.join(process.cwd(), "landingpages");
  const entries = await readdir(landingPagesDir, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isDirectory() && /^[a-z0-9-]+$/i.test(entry.name))
    .map((entry) => entry.name);
}

type LandingPageModule = {
  default: ComponentType;
  metadata?: Metadata;
  generateMetadata?: () => Promise<Metadata> | Metadata;
};

async function loadLandingPage(slug: string): Promise<LandingPageModule | null> {
  try {
    const module = await import(`../../../landingpages/${slug}/page`);
    return module as LandingPageModule;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const slugs = await getLandingPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LandingProxyPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return {};
  }

  const landingPage = await loadLandingPage(slug);
  if (!landingPage) {
    return {};
  }

  if (landingPage.generateMetadata) {
    return await landingPage.generateMetadata();
  }

  return landingPage.metadata ?? {};
}

export default async function LandingProxyPage({ params }: LandingProxyPageProps) {
  const { slug } = await params;

  if (!/^[a-z0-9-]+$/i.test(slug)) {
    notFound();
  }

  const landingPage = await loadLandingPage(slug);
  if (!landingPage) {
    notFound();
  }

  const LandingPageComponent = landingPage.default;
  return <LandingPageComponent />;
}
