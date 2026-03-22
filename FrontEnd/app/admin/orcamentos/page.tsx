"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminOrcamentosPage() {
  return (
    <ModulePlaceholder
      title="Orcamentos"
      description="Controle de valores, aprovacoes e etapas financeiras para manter previsibilidade comercial."
      tableHeaders={["Cliente", "Numero", "Status"]}
      rows={[
        { id: "ORC-458", main: "Construtora Vale Norte", secondary: "R$ 34.500,00", status: "Aguardando aprovacao", statusTone: "warning" },
        { id: "ORC-455", main: "Grupo Vision", secondary: "R$ 18.900,00", status: "Aprovado", statusTone: "success" },
        { id: "ORC-451", main: "Inova Labs", secondary: "R$ 12.300,00", status: "Em revisao", statusTone: "default" },
      ]}
      stats={[
        { label: "Orcamentos no mes", value: 23 },
        { label: "Ticket medio", value: "R$ 21.7k" },
        { label: "Aprovacao", value: "48%" },
      ]}
    />
  );
}
