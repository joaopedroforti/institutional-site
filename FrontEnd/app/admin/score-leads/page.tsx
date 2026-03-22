"use client";

import { useSuperadmin } from "../components/superadmin-context";
import ModulePlaceholder from "../components/module-placeholder";

export default function AdminScoreLeadsPage() {
  const { summary } = useSuperadmin();

  return (
    <ModulePlaceholder
      title="Score de leads"
      description="Priorizacao da fila comercial com base em sinais de intencao e dados de identificacao."
      tableHeaders={["Lead", "Codigo", "Score"]}
      rows={[
        { id: "LEAD-901", main: "Bruna Melo", secondary: "Interagiu com proposta e formulario", status: "A - Muito quente", statusTone: "success" },
        { id: "LEAD-876", main: "Caio Vieira", secondary: "Visitou servicos e cases", status: "B - Qualificado", statusTone: "default" },
        { id: "LEAD-853", main: "Guilherme Nunes", secondary: "Apenas primeira visita", status: "C - Nutrir", statusTone: "muted" },
      ]}
      stats={[
        { label: "Leads pendentes", value: summary.contacts_pending },
        { label: "Leads totais", value: summary.contacts_total },
        { label: "Visitantes identificados", value: summary.sessions_identified },
      ]}
    />
  );
}
