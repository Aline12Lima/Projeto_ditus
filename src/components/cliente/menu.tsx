"use client";

import { useEffect, useState } from "react";
import { ProductModal } from "@/components/cliente/product-modal";
import { Back } from "@/components/shared/back";
import { CartBar } from "@/components/shared/cart-bar";
import { Shell } from "@/components/shared/shell";
import { useCart } from "@/hooks/use-cart";
import { useMenuItems } from "@/hooks/use-menu-items";
import { formatPrice, toNumber } from "@/lib/formatters";
import type { Dish } from "@/types/menu";

export function Menu() {
  const [locale, setLocale] = useState<"pt" | "en" | "es">("pt");
  const { items, loading, error } = useMenuItems(false, locale);
  const { cart, add, totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const availableItems = items.filter((item) => item.active);
  const categories = Array.from(new Set(availableItems.map((item) => item.category)));
  const visibleItems = activeCategory === "Todos" ? availableItems : availableItems.filter((item) => item.category === activeCategory);
  const total = cart.reduce((sum, cartItem) => sum + toNumber(items.find((item) => item.id === cartItem.dishId)?.price ?? "R$ 0") * cartItem.quantity, 0);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("ditus-language");
    setLocale(savedLanguage === "EN" ? "en" : savedLanguage === "ES" ? "es" : "pt");
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setSelectedDish(null); }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return <Shell><header className="menu-header"><Back href="/cliente" /><div><h1>Cardápio</h1><p>Restaurante Ditos</p></div><a href="/cliente/carrinho" className="bag" aria-label={`Ver carrinho, ${totalItems} itens`}>🛒<b>{totalItems}</b></a></header><section className="menu"><div className="chips" aria-label="Categorias do cardápio"><button className={activeCategory === "Todos" ? "selected" : ""} onClick={() => setActiveCategory("Todos")}>Todos</button>{categories.map((category) => <button key={category} className={activeCategory === category ? "selected" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><h2>{activeCategory === "Todos" ? "Mais pedidos" : activeCategory}</h2>{loading && <p className="empty-menu">Carregando cardápio...</p>}{error && <p className="feedback-message error" role="alert">{error}</p>}{!loading && !error && visibleItems.map((item) => <article className="dish" key={item.id} onClick={() => setSelectedDish(item)}><div className="dish-photo">{item.emoji}</div><div><h3>{item.name}</h3><p>{item.description}</p><b>{item.price}</b></div><button aria-label={`Ver detalhes de ${item.name}`} onClick={(event) => { event.stopPropagation(); setSelectedDish(item); }}>+</button></article>)}{!loading && !error && visibleItems.length === 0 && <p className="empty-menu">Ainda não há itens nesta categoria.</p>}</section>{totalItems > 0 && <CartBar total={formatPrice(total)} />}{selectedDish && <ProductModal dish={selectedDish} onClose={() => setSelectedDish(null)} onAdd={() => { add(selectedDish.id); setSelectedDish(null); }} />}</Shell>;
}
