"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminPropostasPage() {
  return (
    <ModulePlaceholder
      title="Propostas"
      description="Acompanhamento de propostas em negociacao para acelerar follow-up e fechamento."
      tableHeaders={["Projeto", "Codigo", "Fase"]}
      rows={[
        { id: "PROP-302", main: "Portal institucional + CRM", secondary: "Cliente: Solis", status: "Negociacao", statusTone: "warning" },
        { id: "PROP-299", main: "Squad de sustentacao", secondary: "Cliente: Altum", status: "Enviada", statusTone: "default" },
        { id: "PROP-294", main: "Automacao de atendimento", secondary: "Cliente: Cronos", status: "Fechada", statusTone: "success" },
      ]}
      stats={[
        { label: "Propostas abertas", value: 11 },
        { label: "Conversao", value: "39%" },
        { label: "Valor em pipeline", value: "R$ 284k" },
      ]}
    />
  );
}
