export const MENU_CATEGORIES = ["Pizza", "Porções", "Hambúrgueres", "Bebidas", "Sobremesas"] as const;

export type CategoryName = string;

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
  categoryId?: string;
  slug?: string;
  imageUrl?: string | null;
  nameTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
};

export type Dish = Product;

export type CartItem = {
  dishId: string;
  quantity: number;
};
