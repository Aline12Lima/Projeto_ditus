import { describe, expect, it } from "vitest";
import { createOrderSchema, orderReviewSchema, paymentMethodSchema, productSchema, tableVisitSchema } from "@/lib/api/schemas";

const productId = "20000000-0000-4000-8000-000000000001";

describe("create order validation", () => {
  it("accepts positive quantities and ignores a client total", () => {
    const result = createOrderSchema.parse({ customerName: "Aline", customerToken: crypto.randomUUID(), notes: "", idempotencyKey: crypto.randomUUID(), items: [{ productId, quantity: 2 }], total: 0.01 });
    expect(result).not.toHaveProperty("total");
  });

  it("rejects empty orders and invalid quantities", () => {
    expect(() => createOrderSchema.parse({ table: 1, notes: "", idempotencyKey: crypto.randomUUID(), items: [] })).toThrow();
    expect(() => createOrderSchema.parse({ table: 1, notes: "", idempotencyKey: crypto.randomUUID(), items: [{ productId, quantity: 0 }] })).toThrow();
  });
});

describe("mesa, pagamento e avaliação",()=>{
  it("valida entrada por QR",()=>{expect(tableVisitSchema.safeParse({accessToken:"40000000-0000-4000-8000-000000000001",customerName:"Aline",customerToken:"50000000-0000-4000-8000-000000000001"}).success).toBe(true)});
  it("limita métodos de pagamento",()=>{expect(paymentMethodSchema.safeParse("PIX").success).toBe(true);expect(paymentMethodSchema.safeParse("BOLETO").success).toBe(false)});
  it("exige nota e limita comentário",()=>{expect(orderReviewSchema.safeParse({trackingToken:"50000000-0000-4000-8000-000000000001",rating:5,comment:""}).success).toBe(true);expect(orderReviewSchema.safeParse({trackingToken:"50000000-0000-4000-8000-000000000001",rating:0,comment:""}).success).toBe(false)});
});

describe("product validation", () => {
  it("rejects a non-positive price", () => {
    expect(() => productSchema.parse({ categoryId: crypto.randomUUID(), slug: "test", nameTranslations: { pt: "Teste" }, price: 0 })).toThrow();
  });
});
