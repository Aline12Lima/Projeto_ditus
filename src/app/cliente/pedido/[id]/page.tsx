import { ClientOrderStatus } from "@/components/cliente/order-status";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ id }, { token = "" }] = await Promise.all([params, searchParams]);
  return <ClientOrderStatus id={id} token={token} />;
}
