import type { ReactNode } from "react";
import { CustomerFlowLifecycle } from "@/components/cliente/customer-flow-lifecycle";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <><CustomerFlowLifecycle />{children}</>;
}
