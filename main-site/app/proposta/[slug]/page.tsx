import type { Metadata } from "next";
import ProposalPublicClient from "./proposal-public-client";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type ProposalPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProposalPage({ params }: ProposalPageProps) {
  const resolved = await params;
  return <ProposalPublicClient slug={resolved.slug} />;
}

