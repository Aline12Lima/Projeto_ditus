import { z } from "zod";

export const orderStatusSchema = z.enum(["RECEBIDO", "EM_PREPARO", "PRONTO", "ENTREGUE", "AGUARDANDO_PAGAMENTO", "PAGO", "CANCELADO"]);
export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerToken: z.string().uuid(),
  notes: z.string().max(1000).default(""),
  idempotencyKey: z.string().uuid(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1),
});
export const customerVisitSchema = z.object({ customerName:z.string().trim().min(2).max(80), customerToken:z.string().uuid() });
export const assignCustomerVisitSchema = z.object({ tableNumber:z.number().int().min(1).max(45) });
export const productSchema = z.object({
  categoryId: z.string().uuid(), slug: z.string().regex(/^[a-z0-9-]+$/),
  nameTranslations: z.record(z.string(), z.string().min(1)).refine((value) => Boolean(value.pt)),
  descriptionTranslations: z.record(z.string(), z.string()).default({}),
  price: z.number().positive().max(9999999999), imageUrl: z.string().min(1).max(500).nullable().optional(),
  emoji: z.string().min(1).max(16).default("🍽️"), active: z.boolean().default(true),
});
export const updateProductSchema = productSchema.partial().refine((value) => Object.keys(value).length > 0);
