"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminConfiguracoesGeraisPage() {
  return (
    <ModulePlaceholder
      title="Configuracoes gerais"
      description="Parametros globais do sistema para regras de operacao, notificacao e integracoes."
      tableHeaders={["Configuracao", "ID", "Estado"]}
      rows={[
        { id: "CFG-01", main: "Canal de notificacao interna", secondary: "E-mail + painel", status: "Ativo", statusTone: "success" },
        { id: "CFG-02", main: "Politica de distribuicao de leads", secondary: "Round robin comercial", status: "Ativo", statusTone: "success" },
        { id: "CFG-03", main: "Webhook de automacao", secondary: "Integracao com CRM externo", status: "Ajuste pendente", statusTone: "warning" },
      ]}
      stats={[
        { label: "Integracoes conectadas", value: 4 },
        { label: "Regras ativas", value: 12 },
        { label: "Auditoria", value: "Sem falhas" },
      ]}
    />
  );
}
