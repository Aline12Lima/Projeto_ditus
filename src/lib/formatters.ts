export function toNumber(price: string) {
  const value = Number(price.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
  return Number.isFinite(value) ? value : 0;
}

export function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isValidPrice(price: string) {
  const value = toNumber(price);
  return /^\s*(R\$\s*)?\d{1,3}(\.\d{3})*(,\d{1,2})?\s*$|^\s*(R\$\s*)?\d+(,\d{1,2})?\s*$/.test(price) && value > 0;
}

export function normalizePrice(price: string) {
  return formatPrice(toNumber(price));
}
