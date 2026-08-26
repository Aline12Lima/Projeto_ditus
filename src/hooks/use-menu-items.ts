"use client";

import { useEffect, useState } from "react";
import { INITIAL_DISHES } from "@/data/menu-items";
import { readStorageJson } from "@/lib/storage";
import { MENU_CATEGORIES, type CategoryName, type Dish } from "@/types/menu";

const MENU_STORAGE_KEY = "ditus-menu-items";

function isStoredMenu(value: unknown): value is Partial<Dish>[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null
    && typeof item.id === "string" && typeof item.name === "string"
    && typeof item.description === "string" && typeof item.price === "string"
    && typeof item.emoji === "string");
}

function categoryForItem(item: Partial<Dish>): CategoryName {
  if (item.category && MENU_CATEGORIES.includes(item.category)) return item.category;
  if (item.id === "pizza") return "Pizza";
  if (item.id === "fries") return "Porções";
  return "Hambúrgueres";
}

export function useMenuItems() {
  const [items, setItems] = useState<Dish[]>(INITIAL_DISHES);

  useEffect(() => {
    const parsedItems = readStorageJson<Partial<Dish>[] | null>(MENU_STORAGE_KEY, null, (value): value is Partial<Dish>[] | null => value === null || isStoredMenu(value));
    if (parsedItems !== null) {
      setItems(parsedItems.map((item) => ({ ...item, category: categoryForItem(item), active: item.active ?? true })) as Dish[]);
    }
  }, []);

  function save(nextItems: Dish[]) {
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(nextItems));
    setItems(nextItems);
  }

  return { items, save };
}
