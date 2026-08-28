import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_SUPABASE_READY, "Requer migrations, seed e credenciais do Supabase configurados.");

test("admin associa mesa e cliente cria pedido", async ({ page, browser }) => {
  const customerName=`Aline E2E ${Date.now()}`;
  await page.goto("/cliente");
  await page.getByLabel("Seu nome").fill(customerName);
  await page.getByRole("button", { name: "Iniciar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Cardápio" })).toBeVisible();
  await page.locator(".dish").first().click();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByText("Ver carrinho").click();
  await expect(page.getByRole("button", { name: /Aguardando mesa/ })).toBeDisabled();
  const adminContext=await browser.newContext();const admin=await adminContext.newPage();
  await admin.goto("/funcionario/login");
  await admin.getByLabel("E-mail").fill(process.env.E2E_ADMIN_EMAIL!);
  await admin.getByLabel("Senha").fill(process.env.E2E_ADMIN_PASSWORD!);
  await admin.getByRole("button",{name:"Entrar"}).click();
  const waitingCard=admin.getByRole("article").filter({hasText:customerName});const tableSelect=waitingCard.getByLabel(`Mesa para ${customerName}`);await expect(tableSelect).toBeVisible();await tableSelect.selectOption({index:1});
  await waitingCard.getByRole("button",{name:"Associar"}).click();
  const assignedTable = page.getByText(/Mesa \d+/);
  await expect(assignedTable).toBeVisible({timeout:15000});
  const tableNumber = Number((await assignedTable.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole("button", { name: /Revisar e enviar/ }).click();
  await page.getByRole("button", { name: "Confirmar envio" }).click();
  await expect(page.getByText("Pedido enviado!")).toBeVisible();
  await expect(page.getByRole("link", { name: "Acompanhar pedido" })).toBeVisible();

  await admin.reload();
  const orderLink = admin.locator(".order").filter({ hasText: customerName });
  await expect(orderLink).toBeVisible({ timeout: 15000 });
  await orderLink.click();
  await admin.evaluate(() => { window.print = () => undefined; });
  await admin.getByRole("button", { name: "Enviar para cozinha e imprimir" }).click();
  await admin.getByRole("button", { name: "Marcar como pronto" }).click();
  await admin.getByRole("button", { name: "Pedido entregue" }).click();
  await admin.getByRole("button", { name: "Solicitar pagamento" }).click();
  await admin.getByRole("button", { name: "Pedido pago e liberar mesa" }).click();

  const customerToken = await page.evaluate(() => localStorage.getItem("ditus-customer-token"));
  await expect.poll(async () => {
    const response = await page.request.get(`/api/customer-visits?token=${encodeURIComponent(customerToken ?? "")}`);
    return response.status();
  }).toBe(404);
  await expect.poll(async () => {
    const response = await admin.request.get("/api/tables");
    const tables = await response.json() as Array<{ number: number; status: string }>;
    return tables.find((table) => table.number === tableNumber)?.status;
  }).toBe("LIVRE");
  await adminContext.close();
});
