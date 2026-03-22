"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminVendedoresPage() {
  return (
    <ModulePlaceholder
      title="Vendedores"
      description="Gestao de performance do time comercial com foco em produtividade, resposta e fechamento."
      tableHeaders={["Vendedor", "ID", "Performance"]}
      rows={[
        { id: "VEN-12", main: "Amanda Lopes", secondary: "11 oportunidades ativas", status: "Acima da meta", statusTone: "success" },
        { id: "VEN-08", main: "Rafael Costa", secondary: "9 oportunidades ativas", status: "No ritmo", statusTone: "default" },
        { id: "VEN-05", main: "Marina Teixeira", secondary: "7 oportunidades ativas", status: "Precisa de apoio", statusTone: "warning" },
      ]}
      stats={[
        { label: "Meta mensal", value: "R$ 480k" },
        { label: "Realizado", value: "R$ 356k" },
        { label: "Taxa de resposta", value: "91%" },
      ]}
    />
  );
}
