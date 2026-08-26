"use client";

import { useState } from "react";
import { Back } from "@/components/shared/back";
import { Shell } from "@/components/shared/shell";
import { useMenuItems } from "@/hooks/use-menu-items";
import { isValidPrice, normalizePrice } from "@/lib/formatters";
import { MENU_CATEGORIES, type Dish } from "@/types/menu";

export function EmployeeMenu() {
  const { items, save } = useMenuItems();
  const [editing, setEditing] = useState<Dish | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const emptyItem: Dish = { id: "", name: "", description: "", price: "", emoji: "🍽️", category: "Hambúrgueres", active: true };
  const formItem = editing ?? emptyItem;

  function updateField(field: keyof Dish, value: string) {
    setEditing({ ...formItem, [field]: value });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formItem.name.trim()) {
      setValidationMessage("Informe o nome do produto.");
      return;
    }
    if (!isValidPrice(formItem.price)) {
      setValidationMessage("Informe um preço válido e maior que zero. Ex.: R$ 29,90.");
      return;
    }
    const nextItem = { ...formItem, name: formItem.name.trim(), price: normalizePrice(formItem.price), id: formItem.id || crypto.randomUUID() };
    save(items.some((item) => item.id === nextItem.id)
      ? items.map((item) => item.id === nextItem.id ? nextItem : item)
      : [...items, nextItem]);
    setEditing(null);
    setIsAdding(false);
    setValidationMessage("");
  }

  function removeItem(item: Dish) {
    if (window.confirm(`Excluir ${item.name} do cardápio?`)) save(items.filter((menuItem) => menuItem.id !== item.id));
  }

  return <Shell><header className="menu-header employee-menu-header"><Back href="/funcionario/painel" /><div><h1>Cardápio</h1><p>Gerencie os itens disponíveis</p></div><button className="round-add" aria-label="Adicionar novo item" onClick={() => { setEditing(emptyItem); setIsAdding(true); setValidationMessage(""); }}>+</button></header><section className="employee-menu"><div className="menu-summary"><span>Itens ativos</span><b>{items.filter((item) => item.active).length}</b></div>{items.length === 0 && <p className="empty-menu">Nenhum item no cardápio. Use o botão + para adicionar.</p>}{items.map((item) => <article className={`admin-dish ${item.active ? "" : "inactive"}`} key={item.id}><div className="dish-photo">{item.emoji}</div><div><h3>{item.name}</h3><p>{item.description}</p><b>{item.price}</b><small>{item.category} · {item.active ? "Ativo" : "Inativo"}</small></div><div className="admin-actions"><button aria-label={`${item.active ? "Desativar" : "Ativar"} ${item.name}`} onClick={() => save(items.map((menuItem) => menuItem.id === item.id ? { ...menuItem, active: !menuItem.active } : menuItem))}>{item.active ? "◉" : "○"}</button><button aria-label={`Editar ${item.name}`} onClick={() => { setEditing(item); setIsAdding(false); setValidationMessage(""); }}>✎</button><button aria-label={`Remover ${item.name}`} className="remove" onClick={() => removeItem(item)}>⌫</button></div></article>)}</section>{editing && <div className="modal-backdrop"><form className="item-form" onSubmit={submit}><div className="form-title"><h2>{isAdding ? "Novo item" : "Editar item"}</h2><button type="button" onClick={() => { setEditing(null); setIsAdding(false); setValidationMessage(""); }}>×</button></div>{validationMessage && <p className="feedback-message error" role="alert">{validationMessage}</p>}<label>Nome do item<input value={formItem.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ex.: Hambúrguer artesanal" autoFocus /></label><label>Descrição<textarea value={formItem.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Descreva o item" /></label><label>Categoria<select value={formItem.category} onChange={(event) => updateField("category", event.target.value)}>{MENU_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><div className="form-grid"><label>Preço<input value={formItem.price} onChange={(event) => updateField("price", event.target.value)} placeholder="R$ 00,00" /></label><label>Ícone<input value={formItem.emoji} onChange={(event) => updateField("emoji", event.target.value)} placeholder="🍔" /></label></div><label className="availability-field"><input type="checkbox" checked={formItem.active} onChange={(event) => setEditing({ ...formItem, active: event.target.checked })} /> Produto disponível no cardápio</label><button className="solid-button" type="submit">{isAdding ? "Adicionar item" : "Salvar alterações"}</button></form></div>}<nav className="bottom-nav"><a href="/funcionario/painel">⌂<small>Início</small></a><a>▤<small>Pedidos</small></a><a className="active" href="/funcionario/cardapio">▦<small>Cardápio</small></a><a>⚙<small>Ajustes</small></a></nav></Shell>;
}
