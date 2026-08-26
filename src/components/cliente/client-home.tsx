"use client";

import { useEffect, useState } from "react";
import { Logo, Mark } from "@/components/shared/logo";
import { Shell } from "@/components/shared/shell";

export function ClientHome() {
  const [lang, setLang] = useState<"PT" | "ES" | "EN">("PT");
  const languageStorageKey = "ditus-language";

  useEffect(() => {
    const saved = localStorage.getItem(languageStorageKey);
    if (saved === "PT" || saved === "ES" || saved === "EN") setLang(saved);
  }, []);

  function changeLanguage(nextLanguage: "PT" | "ES" | "EN") {
    setLang(nextLanguage);
    localStorage.setItem(languageStorageKey, nextLanguage);
  }
  const copy = {
    PT: { title: <>Bem-vindo ao<br />Restaurante Ditos.</>, description: "Escolha seu idioma e aproveite o sabor que aproxima.", menu: "Iniciar pedido", language: "Escolha o seu idioma", home: "Início", menuNav: "Cardápio", cart: "Carrinho", profile: "Perfil" },
    ES: { title: <>Bienvenido al<br />Restaurante Ditos.</>, description: "Elige tu idioma y disfruta del sabor que une.", menu: "Empezar pedido", language: "Elige tu idioma", home: "Inicio", menuNav: "Menú", cart: "Carrito", profile: "Perfil" },
    EN: { title: <>Welcome to<br />Restaurante Ditos.</>, description: "Choose your language and enjoy flavor that brings us together.", menu: "Start order", language: "Choose your language", home: "Home", menuNav: "Menu", cart: "Cart", profile: "Profile" },
  }[lang];

  return <Shell><header className="client-header"><Logo /><button className="language" onClick={() => changeLanguage(lang === "PT" ? "ES" : lang === "ES" ? "EN" : "PT")}>{lang}⌄</button></header><section className="client-home welcome-home"><div className="hero-photo"><div><Mark /><h1>{copy.title}</h1><p>{copy.description}</p><p className="language-label">{copy.language}</p><div className="language-options"><button className={lang === "PT" ? "selected" : ""} onClick={() => changeLanguage("PT")}>Português</button><button className={lang === "ES" ? "selected" : ""} onClick={() => changeLanguage("ES")}>Español</button><button className={lang === "EN" ? "selected" : ""} onClick={() => changeLanguage("EN")}>English</button></div><a href="/cliente/cardapio">{copy.menu}</a></div></div></section><nav className="bottom-nav client"><a className="active" href="/cliente">⌂<small>{copy.home}</small></a><a href="/cliente/cardapio">▤<small>{copy.menuNav}</small></a><a href="/cliente/carrinho">🛒<small>{copy.cart}</small></a><a>◉<small>{copy.profile}</small></a></nav></Shell>;
}
