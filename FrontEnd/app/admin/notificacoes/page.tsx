"use client";

import { useSuperadmin } from "../components/superadmin-context";
import ModulePlaceholder from "../components/module-placeholder";

export default function AdminNotificacoesPage() {
  const { summary } = useSuperadmin();

  return (
    <ModulePlaceholder
      title="Notificacoes"
      description="Central de alertas para eventos comerciais e operacionais relevantes do dia."
      tableHeaders={["Alerta", "Codigo", "Prioridade"]}
      rows={[
        { id: "NTF-120", main: "Novo lead sem retorno", secondary: "Ha mais de 24h aguardando contato", status: "Alta", statusTone: "warning" },
        { id: "NTF-118", main: "Proposta visualizada", secondary: "Cliente abriu documento 3x", status: "Media", statusTone: "default" },
        { id: "NTF-116", main: "Atualizacao de rastreamento", secondary: "Script ativo em todas as paginas", status: "Informativa", statusTone: "muted" },
      ]}
      stats={[
        { label: "Pendentes", value: summary.contacts_pending },
        { label: "Eventos totais", value: summary.interactions_total },
        { label: "Sessoes hoje", value: summary.sessions_total },
      ]}
    />
  );
}
