import { describe, expect, it } from "vitest";
import { createOrderSchema, productSchema } from "@/lib/api/schemas";

const productId = "20000000-0000-4000-8000-000000000001";

describe("create order validation", () => {
  it("accepts positive quantities and ignores a client total", () => {
    const result = createOrderSchema.parse({ table: 1, notes: "", idempotencyKey: crypto.randomUUID(), items: [{ productId, quantity: 2 }], total: 0.01 });
    expect(result).not.toHaveProperty("total");
  });

  it("rejects empty orders and invalid quantities", () => {
    expect(() => createOrderSchema.parse({ table: 1, notes: "", idempotencyKey: crypto.randomUUID(), items: [] })).toThrow();
    expect(() => createOrderSchema.parse({ table: 1, notes: "", idempotencyKey: crypto.randomUUID(), items: [{ productId, quantity: 0 }] })).toThrow();
  });
});

describe("product validation", () => {
  it("rejects a non-positive price", () => {
    expect(() => productSchema.parse({ categoryId: crypto.randomUUID(), slug: "test", nameTranslations: { pt: "Teste" }, price: 0 })).toThrow();
  });
});
