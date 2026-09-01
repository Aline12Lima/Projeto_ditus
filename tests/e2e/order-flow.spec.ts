import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

test.skip(!process.env.E2E_SUPABASE_READY, "Requer migrations, seed e credenciais do Supabase configurados.");

test.beforeAll(async () => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Credenciais E2E ADMIN não configuradas.");

  const status = execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8" });
  const localEnv = Object.fromEntries(status.split("\n").flatMap((line) => {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    return match ? [[match[1], match[2]]] : [];
  }));
  const url = localEnv.API_URL;
  const serviceKey = localEnv.SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase local não está disponível para a fixture E2E.");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: users, error: usersError } = await admin.auth.admin.listUsers();
  if (usersError) throw usersError;
  let user = users.users.find((candidate) => candidate.email === email);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const { error: profileError } = await admin.from("staff_profiles").upsert({ user_id: user.id, role: "ADMIN", active: true });
  if (profileError) throw profileError;

  const verifier = createClient(url, localEnv.ANON_KEY, { auth: { persistSession: false } });
  const { error: loginError } = await verifier.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error(`A fixture E2E não conseguiu autenticar o ADMIN: ${loginError.message}`);
});

async function loginAdmin(admin: import("@playwright/test").Page) {
  await admin.goto("/funcionario/login");
  await admin.getByLabel("E-mail").fill(process.env.E2E_ADMIN_EMAIL!);
  await admin.getByLabel("Senha").fill(process.env.E2E_ADMIN_PASSWORD!);
  await Promise.all([
    admin.waitForURL(/\/funcionario\/painel$/),
    admin.getByRole("button", { name: "Entrar" }).click(),
  ]);
  await expect.poll(async () => (await admin.request.get("/api/admin/customer-visits")).status()).toBe(200);
}

test("admin associa mesa e cliente cria pedido", async ({ page, browser }) => {
  const customerName=`Aline E2E ${Date.now()}`;
  await page.goto("/cliente");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Seu nome").fill(customerName);
  await page.getByRole("button", { name: "Iniciar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Cardápio" })).toBeVisible();
  await page.locator(".dish").first().click();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByText("Ver carrinho").click();
  await expect(page.getByRole("button", { name: /Aguardando mesa/ })).toBeDisabled();
  const adminContext=await browser.newContext();const admin=await adminContext.newPage();
  await loginAdmin(admin);
  const waitingCard=admin.getByRole("article").filter({hasText:customerName});const tableSelect=waitingCard.getByLabel(`Mesa para ${customerName}`);await expect(tableSelect).toBeVisible();await tableSelect.selectOption({index:1});
  await waitingCard.getByRole("button",{name:"Associar"}).click();
  const assignedTable = page.getByText(/Mesa \d+/);
  await expect(assignedTable).toBeVisible({timeout:15000});
  const tableNumber = Number((await assignedTable.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await page.getByRole("button", { name: "Confirmar e enviar pedido" }).click();
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
  await page.getByRole("link", { name: "Acompanhar pedido" }).click();
  await expect(page.getByRole("heading",{name:"Pagar"})).toBeVisible({timeout:15000});
  await page.getByRole("button",{name:"Dinheiro"}).click();
  await expect(admin.getByRole("button",{name:"Confirmar pagamento recebido"})).toBeVisible({timeout:15000});
  await admin.getByRole("button",{name:"Confirmar pagamento recebido"}).click();

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

test("QR associa mesa diretamente, pagamento exige confirmação e cliente avalia",async({page,browser})=>{
  test.setTimeout(60_000);
  const customerName=`QR E2E ${Date.now()}`;
  await page.goto("/mesa/1?token=40000000-0000-4000-8000-000000000001");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Sua mesa foi identificada pelo QR Code.")).toBeVisible();
  await page.getByLabel("Seu nome").fill(customerName);
  await page.getByRole("button",{name:"Iniciar pedido"}).click();
  await expect(page.getByRole("heading",{name:"Cardápio"})).toBeVisible();
  const firstDish=page.locator(".dish").first();
  await firstDish.getByRole("button",{name:/Adicionar .* ao carrinho/}).click();
  await expect(page.getByText("Ver carrinho")).toBeVisible();
  await page.getByText("Ver carrinho").click();
  await expect(page.getByText("Mesa 01")).toBeVisible();
  await expect(page.getByText(/Aguardando o atendimento associar/)).toHaveCount(0);
  await page.getByRole("button",{name:/Confirmar pedido/}).click();
  await page.getByRole("button",{name:"Confirmar e enviar pedido"}).click();
  const trackingLink=page.getByRole("link",{name:"Acompanhar pedido"});
  const trackingHref=await trackingLink.getAttribute("href");
  await trackingLink.click();
  await expect(page.getByText("Pedido recebido")).toBeVisible();

  const adminContext=await browser.newContext(),admin=await adminContext.newPage();
  await loginAdmin(admin);
  const orderLink=admin.locator(".order").filter({hasText:customerName});
  await expect(orderLink).toBeVisible({timeout:15000});await orderLink.click();
  await admin.getByRole("button",{name:/Adicionar .*$/}).first().click();
  await Promise.all([admin.waitForResponse(response=>response.url().includes("/order-revisions/")&&response.request().method()==="PUT"),admin.getByRole("button",{name:"Salvar revisão"}).click()]);
  await admin.evaluate(()=>{window.print=()=>undefined});
  await admin.getByRole("button",{name:"Enviar para cozinha e imprimir"}).click();
  await admin.getByRole("button",{name:"Marcar como pronto"}).click();
  await admin.getByRole("button",{name:"Pedido entregue"}).click();

  await expect(page.getByRole("heading",{name:"Pagar"})).toBeVisible({timeout:15000});
  await page.getByRole("button",{name:"Dinheiro"}).click();
  await expect(page.getByText(/Garçom solicitado/)).toBeVisible();
  await expect(page.getByText("Pago")).toHaveCount(0);
  await expect(admin.getByText(/DINHEIRO/)).toBeVisible({timeout:15000});
  await admin.getByRole("button",{name:"Confirmar pagamento recebido"}).click();
  await expect(page.getByRole("heading",{name:"Obrigado!"})).toBeVisible();
  await page.getByRole("button",{name:"5 estrelas"}).click();
  await page.getByLabel(/Conte o que achou/).fill("Atendimento excelente");
  await page.getByRole("button",{name:"Enviar avaliação"}).click();
  await expect(page.getByText("Obrigado pela sua avaliação!")).toBeVisible();
  expect(trackingHref).toContain("token=");
  await adminContext.close();
});
