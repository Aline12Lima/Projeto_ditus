"use client";

import { useEffect, useState } from "react";
import { Back } from "@/components/shared/back";
import { Shell } from "@/components/shared/shell";
import { useMenuItems } from "@/hooks/use-menu-items";
import { isValidPrice, normalizePrice, toNumber } from "@/lib/formatters";
import type { Dish } from "@/types/menu";
import { ProductImage } from "@/components/shared/product-image";

type ApiCategory = { id: string; name_translations: Record<string, string> };

export function EmployeeMenu() {
  const { items, loading, error: loadError, refresh } = useMenuItems(true);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const emptyItem: Dish = { id: "", name: "", description: "", price: "", emoji: "🍽️", category: "Hambúrgueres", categoryId: "", active: true };
  const formItem = editing ?? emptyItem;

  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCategories(body as ApiCategory[]);
    }).catch((requestError) => { setIsError(true); setMessage(requestError instanceof Error ? requestError.message : "Erro ao carregar categorias."); });
  }, []);

  function updateField(field: "name" | "description" | "price" | "emoji", value: string) {
    setEditing({ ...formItem, [field]: value });
  }

  function slugify(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function request(path: string, method: string, body?: object) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Operação não concluída.");
    return result;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsError(true);
    if (!formItem.name.trim()) { setMessage("Informe o nome do produto."); return; }
    if (!formItem.categoryId) { setMessage("Selecione uma categoria."); return; }
    if (!isValidPrice(formItem.price)) { setMessage("Informe um preço válido e maior que zero. Ex.: R$ 29,90."); return; }
    try {
      let imageUrl = formItem.imageUrl ?? null;
      if (imageFile) { const uploadBody = new FormData(); uploadBody.set("image", imageFile); const upload = await fetch("/api/products/image", { method: "POST", body: uploadBody }); const uploaded = await upload.json(); if (!upload.ok) throw new Error(uploaded.error); imageUrl = uploaded.url; }
      const payload = {
        categoryId: formItem.categoryId, slug: formItem.slug || slugify(formItem.name),
        nameTranslations: { ...(formItem.nameTranslations ?? {}), pt: formItem.name.trim() },
        descriptionTranslations: { ...(formItem.descriptionTranslations ?? {}), pt: formItem.description.trim() },
        price: toNumber(formItem.price), imageUrl, emoji: formItem.emoji, active: formItem.active,
      };
      await request(formItem.id ? `/api/products/${formItem.id}` : "/api/products", formItem.id ? "PATCH" : "POST", payload);
      await refresh();
      setEditing(null); setIsAdding(false); setIsError(false); setMessage(formItem.id ? "Produto atualizado." : "Produto cadastrado.");
    } catch (requestError) { setIsError(true); setMessage(requestError instanceof Error ? requestError.message : "Não foi possível salvar."); }
  }

  async function toggle(item: Dish) {
    try { await request(`/api/products/${item.id}`, "PATCH", { active: !item.active }); await refresh(); setIsError(false); setMessage(item.active ? "Produto desativado." : "Produto ativado."); }
    catch (requestError) { setIsError(true); setMessage(requestError instanceof Error ? requestError.message : "Não foi possível alterar o produto."); }
  }

  async function removeItem(item: Dish) {
    if (!window.confirm(`Excluir ${item.name} do cardápio? O produto será desativado para preservar pedidos antigos.`)) return;
    try { await request(`/api/products/${item.id}`, "DELETE"); await refresh(); setIsError(false); setMessage("Produto removido do cardápio."); }
    catch (requestError) { setIsError(true); setMessage(requestError instanceof Error ? requestError.message : "Não foi possível remover."); }
  }

  const displayedMessage = loadError || message;
  return <Shell><header className="menu-header employee-menu-header"><Back href="/funcionario/painel" /><div><h1>Cardápio</h1><p>Gerencie os itens disponíveis</p></div><button className="round-add" aria-label="Adicionar novo item" onClick={() => { setEditing({ ...emptyItem, categoryId: categories[0]?.id ?? "" }); setIsAdding(true); setMessage(""); }}>+</button></header><section className="employee-menu">{displayedMessage && <p className={`feedback-message ${loadError || isError ? "error" : "success"}`} role="status">{displayedMessage}</p>}<div className="menu-summary"><span>Itens ativos</span><b>{items.filter((item) => item.active).length}</b></div>{loading && <p className="empty-menu">Carregando cardápio...</p>}{!loading && items.length === 0 && <p className="empty-menu">Nenhum item no cardápio. Use o botão + para adicionar.</p>}{items.map((item) => <article className={`admin-dish ${item.active ? "" : "inactive"}`} key={item.id}><ProductImage src={item.imageUrl} alt={item.name} fallback={item.emoji} /><div><h3>{item.name}</h3><p>{item.description}</p><b>{item.price}</b><small>{item.category} · {item.active ? "Ativo" : "Inativo"}</small></div><div className="admin-actions"><button aria-label={`${item.active ? "Desativar" : "Ativar"} ${item.name}`} onClick={() => void toggle(item)}>{item.active ? "◉" : "○"}</button><button aria-label={`Editar ${item.name}`} onClick={() => { setEditing(item); setIsAdding(false); setMessage(""); }}>✎</button><button aria-label={`Remover ${item.name}`} className="remove" onClick={() => void removeItem(item)}>⌫</button></div></article>)}</section>{editing && <div className="modal-backdrop"><form className="item-form" onSubmit={submit}><div className="form-title"><h2>{isAdding ? "Novo item" : "Editar item"}</h2><button type="button" onClick={() => { setEditing(null); setIsAdding(false); setMessage(""); }}>×</button></div>{message && isError && <p className="feedback-message error" role="alert">{message}</p>}<label>Nome do item<input value={formItem.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ex.: Hambúrguer artesanal" autoFocus /></label><label>Descrição<textarea value={formItem.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Descreva o item" /></label><label>Categoria<select value={formItem.categoryId} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value); setEditing({ ...formItem, categoryId: event.target.value, category: (category?.name_translations.pt ?? formItem.category) as Dish["category"] }); }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_translations.pt}</option>)}</select></label><div className="form-grid"><label>Preço<input value={formItem.price} onBlur={() => isValidPrice(formItem.price) && updateField("price", normalizePrice(formItem.price))} onChange={(event) => updateField("price", event.target.value)} placeholder="R$ 00,00" /></label><label>Ícone<input value={formItem.emoji} onChange={(event) => updateField("emoji", event.target.value)} placeholder="🍔" /></label></div><label>Foto do produto<ProductImage className="image-preview" src={imagePreview || formItem.imageUrl} alt="Prévia do produto" fallback={formItem.emoji} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : ""); }} /></label><label className="availability-field"><input type="checkbox" checked={formItem.active} onChange={(event) => setEditing({ ...formItem, active: event.target.checked })} /> Produto disponível no cardápio</label><button className="solid-button" type="submit">{isAdding ? "Adicionar item" : "Salvar alterações"}</button></form></div>}<nav className="bottom-nav"><a href="/funcionario/painel">⌂<small>Início</small></a><a href="/funcionario/pedidos">▤<small>Pedidos</small></a><a className="active" href="/funcionario/cardapio">▦<small>Cardápio</small></a><a href="/funcionario/ajustes">⚙<small>Ajustes</small></a></nav></Shell>;
}
