import { Back } from "@/components/shared/back";
import { Mark } from "@/components/shared/logo";
import { Shell } from "@/components/shared/shell";

export function Login() {
  return <Shell><header className="simple-header"><Back href="/" /><Mark /></header><section className="login"><div className="avatar">👤</div><h1>Painel Administrativo</h1><p>Entre para gerenciar seu restaurante.</p><label>E-mail<input placeholder="seu@email.com" type="email" /></label><label>Senha<input placeholder="••••••••" type="password" /></label><a className="forgot" href="#">Esqueci minha senha</a><a className="solid-button" href="/funcionario/painel">Entrar</a><p className="help">Ainda não tem acesso? <a href="#">Fale conosco</a></p></section></Shell>;
}
