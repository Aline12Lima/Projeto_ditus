export const MENU_CATEGORIES = ["Pizza", "Porções", "Hambúrgueres", "Bebidas", "Sobremesas"] as const;

export type CategoryName = (typeof MENU_CATEGORIES)[number];

export type Category = {
  id: string;
  name: CategoryName;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  emoji: string;
  category: CategoryName;
  active: boolean;
};

export type Dish = Product;

export type CartItem = {
  dishId: string;
  quantity: number;
};
