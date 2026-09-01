import { Shell } from "@/components/shared/shell";

export default function Page() {
  return <Shell><div className="order-sent"><span>!</span><h2>Acesso não autorizado</h2><p>Sua conta não possui um perfil de funcionário ativo.</p><form action="/api/auth/logout" method="post"><button className="solid-button" type="submit">Voltar ao login</button></form></div></Shell>;
}
