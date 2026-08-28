import { Suspense } from "react";
import { Login } from "@/components/funcionario/login";
export default function Page() { return <Suspense fallback={null}><Login /></Suspense>; }
