import { ClientHome } from "@/components/cliente/client-home";
import {redirect} from "next/navigation";
export default async function Page({searchParams}:{searchParams:Promise<{mesa?:string;token?:string}>}) { const {mesa,token}=await searchParams;if(mesa&&token)redirect(`/mesa/${encodeURIComponent(mesa)}?token=${encodeURIComponent(token)}`);return <ClientHome />; }
