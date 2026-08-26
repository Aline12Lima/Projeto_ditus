import type { Dish } from "@/types/menu";

export const INITIAL_DISHES: Dish[] = [
  { id: "pizza-margherita", name: "Pizza Margherita", description: "Molho de tomate, muçarela, tomate fresco e manjericão.", price: "R$ 42,00", emoji: "🍕", category: "Pizza", active: true },
  { id: "pizza-pepperoni", name: "Pizza Pepperoni", description: "Molho de tomate, muçarela e pepperoni fatiado.", price: "R$ 48,00", emoji: "🍕", category: "Pizza", active: true },
  { id: "fries", name: "Batata frita", description: "Porção crocante com molho da casa.", price: "R$ 18,90", emoji: "🍟", category: "Porções", active: true },
  { id: "onion-rings", name: "Anéis de cebola", description: "Porção empanada, sequinha e crocante.", price: "R$ 21,90", emoji: "🧅", category: "Porções", active: true },
  { id: "burger", name: "Hambúrguer Clássico", description: "Pão brioche, hambúrguer, queijo e molho especial.", price: "R$ 32,90", emoji: "🍔", category: "Hambúrgueres", active: true },
  { id: "soda", name: "Refrigerante lata", description: "Coca-Cola, Guaraná ou Coca-Cola Zero.", price: "R$ 8,00", emoji: "🥤", category: "Bebidas", active: true },
  { id: "brownie", name: "Brownie com sorvete", description: "Brownie de chocolate servido com sorvete de baunilha.", price: "R$ 19,90", emoji: "🍨", category: "Sobremesas", active: true },
];
