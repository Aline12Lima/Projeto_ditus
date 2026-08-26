import { Logo, Mark } from "@/components/shared/logo";
import { Shell } from "@/components/shared/shell";

export function EmployeeStart() {
  return <Shell><section className="employee-start"><Mark /><div><div className="logo-card"><Logo /></div><h1>Bem-vindo à<br />Ditos</h1><p>Gestão simples, atendimento melhor.</p></div><a className="solid-button" href="/funcionario/login">Acessar painel</a></section></Shell>;
}
