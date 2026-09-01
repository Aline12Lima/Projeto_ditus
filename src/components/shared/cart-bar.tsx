export function CartBar({ href = "/cliente/carrinho", total = "" }: { href?: string; total?: string }) {
  return <a className="cart-bar" href={href}><span>🛒</span><span>Ver carrinho</span><b>{total}</b></a>;
}
