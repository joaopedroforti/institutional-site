"use client";

import ModulePlaceholder from "../components/module-placeholder";

export default function AdminPerfilPage() {
  return (
    <ModulePlaceholder
      title="Perfil do usuario"
      description="Gerenciamento de dados pessoais, preferencias de notificacao e seguranca da conta administrativa."
      tableHeaders={["Preferencia", "ID", "Estado"]}
      rows={[
        { id: "USR-01", main: "Notificacoes por e-mail", secondary: "Resumo diario e alertas criticos", status: "Ativo", statusTone: "success" },
        { id: "USR-02", main: "Autenticacao em duas etapas", secondary: "Via aplicativo autenticador", status: "Ativo", statusTone: "success" },
        { id: "USR-03", main: "Sessao compartilhada", secondary: "Ultimo acesso em notebook", status: "Revisar", statusTone: "warning" },
      ]}
      stats={[
        { label: "Ultimo login", value: "Hoje 09:14" },
        { label: "Dispositivos confiaveis", value: 3 },
        { label: "Nivel de seguranca", value: "Alto" },
      ]}
    />
  );
}
