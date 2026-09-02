"use client";

import { useEffect, useState } from "react";
import { readStorageJson, writeStorageJson } from "@/lib/storage";
import { CART_STORAGE_KEY } from "@/lib/customer-flow";
import type { CartItem } from "@/types/menu";

function isCart(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null
    && typeof (item as CartItem).dishId === "string"
    && Number.isInteger((item as CartItem).quantity)
    && (item as CartItem).quantity > 0);
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(readStorageJson(CART_STORAGE_KEY, [], isCart));
  }, []);

  function save(nextCart: CartItem[]) {
    writeStorageJson(CART_STORAGE_KEY, nextCart);
    setCart(nextCart);
  }

  function add(dishId: string) {
    const item = cart.find((cartItem) => cartItem.dishId === dishId);
    save(item
      ? cart.map((cartItem) => cartItem.dishId === dishId ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem)
      : [...cart, { dishId, quantity: 1 }]);
  }

  function change(dishId: string, quantity: number) {
    save(quantity <= 0
      ? cart.filter((item) => item.dishId !== dishId)
      : cart.map((item) => item.dishId === dishId ? { ...item, quantity } : item));
  }

  return {
    cart,
    add,
    change,
    clear: () => save([]),
    totalItems: cart.reduce((total, item) => total + item.quantity, 0),
  };
}
