import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { z } from "zod";
import type { productSchema, updateProductSchema } from "@/lib/api/schemas";
import { formatPrice } from "@/lib/formatters";

type DbClient = SupabaseClient<Database>;
type ProductInput = z.infer<typeof productSchema>;
type ProductUpdate = z.infer<typeof updateProductSchema>;

export async function listProducts(client: DbClient, includeInactive = false, locale: "pt" | "en" | "es" = "pt") {
  let query = client.from("products").select("*").order("created_at");
  if (!includeInactive) query = query.eq("active", true);
  const [{ data: products, error }, { data: categories, error: categoryError }] = await Promise.all([
    query,
    client.from("categories").select("*").order("created_at"),
  ]);
  if (error) throw error;
  if (categoryError) throw categoryError;
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  return products.map((product) => {
    const category = categoryMap.get(product.category_id);
    const names = product.name_translations as Record<string, string>;
    const descriptions = product.description_translations as Record<string, string>;
    const categoryNames = category?.name_translations as Record<string, string> | undefined;
    return {
      id: product.id, name: names[locale] ?? names.pt, description: descriptions[locale] ?? descriptions.pt ?? "", price: formatPrice(Number(product.price)),
      emoji: product.emoji, category: categoryNames?.[locale] ?? categoryNames?.pt ?? "", active: product.active,
      categoryId: product.category_id, slug: product.slug, imageUrl: product.image_url,
      nameTranslations: names, descriptionTranslations: descriptions,
    };
  });
}

export async function createProduct(client: DbClient, input: ProductInput) {
  const { data, error } = await client.from("products").insert({
    category_id: input.categoryId, slug: input.slug,
    name_translations: input.nameTranslations as Json,
    description_translations: input.descriptionTranslations as Json,
    price: input.price, image_url: input.imageUrl, emoji: input.emoji, active: input.active,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(client: DbClient, id: string, input: ProductUpdate) {
  const update: Database["public"]["Tables"]["products"]["Update"] = {};
  if (input.categoryId !== undefined) update.category_id = input.categoryId;
  if (input.slug !== undefined) update.slug = input.slug;
  if (input.nameTranslations !== undefined) update.name_translations = input.nameTranslations as Json;
  if (input.descriptionTranslations !== undefined) update.description_translations = input.descriptionTranslations as Json;
  if (input.price !== undefined) update.price = input.price;
  if (input.imageUrl !== undefined) update.image_url = input.imageUrl;
  if (input.emoji !== undefined) update.emoji = input.emoji;
  if (input.active !== undefined) update.active = input.active;
  const { data, error } = await client.from("products").update(update).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
