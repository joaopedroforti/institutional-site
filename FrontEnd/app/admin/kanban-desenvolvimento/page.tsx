"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminKanbanDesenvolvimentoPage() {
  return (
    <ModulePlaceholder
      title="Kanban de desenvolvimento"
      description="Gestao do fluxo tecnico, prioridades de sprint e bloqueios operacionais com leitura clara por status."
      tableHeaders={["Tarefa", "Codigo", "Situacao"]}
      rows={[
        { id: "DEV-201", main: "Landing para campanha B2B", secondary: "Squad Frontend", status: "Em andamento", statusTone: "warning" },
        { id: "DEV-198", main: "Integracao CRM + API", secondary: "Squad Backend", status: "Pronto para QA", statusTone: "success" },
        { id: "DEV-195", main: "Refino do painel administrativo", secondary: "Produto", status: "Backlog", statusTone: "muted" },
      ]}
      stats={[
        { label: "Cards ativos", value: 14 },
        { label: "Bloqueios", value: 2 },
        { label: "Entrega da sprint", value: "82%" },
      ]}
    />
  );
}
