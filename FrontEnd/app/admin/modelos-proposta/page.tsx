"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminModelosPropostaPage() {
  return (
    <ModulePlaceholder
      title="Modelos de proposta"
      description="Biblioteca padronizada de templates comerciais para ganho de velocidade com consistencia."
      tableHeaders={["Modelo", "Versao", "Situacao"]}
      rows={[
        { id: "v3.2", main: "Software sob medida", secondary: "Com escopo tecnico detalhado", status: "Publicada", statusTone: "success" },
        { id: "v2.8", main: "Pacote de sustentacao", secondary: "Com SLA por criticidade", status: "Em revisao", statusTone: "warning" },
        { id: "v1.9", main: "Landing + trafego", secondary: "Modelo para campanhas", status: "Arquivada", statusTone: "muted" },
      ]}
      stats={[
        { label: "Modelos ativos", value: 9 },
        { label: "Atualizados no trimestre", value: 6 },
        { label: "Uso medio semanal", value: 17 },
      ]}
    />
  );
}
