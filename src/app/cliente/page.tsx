import { ClientHome } from "@/components/cliente/client-home";
import {redirect} from "next/navigation";
export default async function Page({searchParams}:{searchParams:Promise<{mesa?:string;token?:string;encerrado?:string}>}) { const {mesa,token,encerrado}=await searchParams;if(mesa&&token)redirect(`/mesa/${encodeURIComponent(mesa)}?token=${encodeURIComponent(token)}`);return <ClientHome forceClosed={encerrado==="1"}/>; }
