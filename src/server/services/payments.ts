import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
type Client=SupabaseClient<Database>;
export async function requestPayment(client:Client,id:number,token:string,method:Database["public"]["Enums"]["payment_method"]){const {data,error}=await client.rpc("request_order_payment",{requested_order_id:id,requested_tracking_token:token,requested_method:method});if(error)throw error;return data}
export async function reportPix(client:Client,id:number,token:string){const {data,error}=await client.rpc("report_pix_payment",{requested_order_id:id,requested_tracking_token:token});if(error)throw error;return data}
export async function confirmPayment(client:Client,id:number,userId:string){const {data,error}=await client.rpc("confirm_order_payment",{requested_order_id:id,requested_confirmed_by:userId});if(error)throw error;return data}
