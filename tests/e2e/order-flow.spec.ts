import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_SUPABASE_READY, "Requer migrations, seed e credenciais do Supabase configurados.");

test("cliente cria e recupera um pedido", async ({ page }) => {
  await page.goto("/cliente/cardapio");
  await expect(page.getByRole("heading", { name: "Cardápio" })).toBeVisible();
  await page.locator(".dish").first().click();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByText("Ver carrinho").click();
  await page.getByRole("button", { name: /Revisar e enviar/ }).click();
  await page.getByRole("button", { name: "Confirmar envio" }).click();
  await expect(page.getByText("Pedido enviado!")).toBeVisible();
  await expect(page.getByRole("link", { name: "Acompanhar pedido" })).toBeVisible();
});
