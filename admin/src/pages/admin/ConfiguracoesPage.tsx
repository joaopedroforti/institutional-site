import { useState } from "react";
import PageShell from "./PageShell";

export default function ConfiguracoesPage() {
  const [companyName, setCompanyName] = useState("FortiCorp");
  const [contactEmail, setContactEmail] = useState("contato@forticorp.com.br");

  return (
    <PageShell
      title="Configuracoes"
      description="Preferencias gerais do ambiente administrativo."
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-slate-700">
              Nome da empresa
            </label>
            <input
              id="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:border-blue-500 focus:ring-4"
            />
          </div>

          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail padrao
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:border-blue-500 focus:ring-4"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Salvar configuracoes
            </button>
          </div>
        </form>
      </section>
    </PageShell>
  );
}
