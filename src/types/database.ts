export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: { Row: { id: string; slug: string; name_translations: Json; active: boolean; created_at: string; updated_at: string }; Insert: never; Update: never; Relationships: [] };
      products: { Row: { id: string; category_id: string; slug: string; name_translations: Json; description_translations: Json; price: number; image_url: string | null; emoji: string; active: boolean; created_at: string; updated_at: string }; Insert: { id?: string; category_id: string; slug: string; name_translations: Json; description_translations?: Json; price: number; image_url?: string | null; emoji?: string; active?: boolean }; Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>; Relationships: [] };
      restaurant_tables: { Row: { id: number; number: number; status: Database["public"]["Enums"]["table_status"]; access_token: string; created_at: string; updated_at: string }; Insert: never; Update: { access_token?: string }; Relationships: [] };
      table_sessions: { Row: { id: string; table_id: number; customer_name: string | null; customer_token: string | null; customer_visit_id: string | null; status: "ABERTA" | "ENCERRADA" | "CANCELADA"; opened_at: string; closed_at: string | null; created_at: string; updated_at: string }; Insert: never; Update: never; Relationships: [] };
      customer_visits: { Row: { id:string;customer_name:string;token_hash:string;tracking_token:string;status:Database["public"]["Enums"]["customer_visit_status"];table_session_id:string|null;created_at:string;assigned_at:string|null;closed_at:string|null;updated_at:string }; Insert: never; Update: never; Relationships: [] };
      orders: { Row: { id: number; session_id: string; status: Database["public"]["Enums"]["order_status"]; notes: string; total: number; idempotency_key: string; tracking_token: string; created_at: string; updated_at: string; paid_at: string | null; cancelled_at: string | null }; Insert: never; Update: never; Relationships: [] };
      order_items: { Row: { id: string; order_id: number; product_id: string; product_name: string; unit_price: number; quantity: number; subtotal: number; created_at: string }; Insert: never; Update: never; Relationships: [] };
      staff_profiles: { Row: { user_id: string; role: Database["public"]["Enums"]["staff_role"]; active: boolean; created_at: string; updated_at: string }; Insert: never; Update: never; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      create_order: { Args: { requested_table_number: number; requested_items: Json; requested_notes: string; requested_idempotency_key: string }; Returns: { order_id: number; session_id: string; order_total: number; tracking_token: string }[] };
      transition_order_status: { Args: { requested_order_id: number; requested_status: Database["public"]["Enums"]["order_status"] }; Returns: Database["public"]["Tables"]["orders"]["Row"] };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      validate_table_access: { Args: { requested_table_number: number; requested_access_token: string }; Returns: boolean };
      create_customer_order: { Args: { requested_customer_name: string; requested_customer_token: string; requested_items: Json; requested_notes: string; requested_idempotency_key: string }; Returns: { order_id:number;session_id:string;order_total:number;tracking_token:string;table_number:number }[] };
      create_customer_visit: { Args:{requested_customer_name:string;requested_token:string};Returns:{visit_id:string;visit_status:string;tracking_token:string;table_number:number|null}[] };
      get_customer_visit: { Args:{requested_token:string};Returns:{visit_id:string;customer_name:string;visit_status:string;tracking_token:string;table_number:number|null}[] };
      assign_customer_visit: { Args:{requested_visit_id:string;requested_table_number:number};Returns:{visit_id:string;session_id:string;table_number:number}[] };
      paid_sales_report: { Args: { date_from: string; date_to: string; table_number?: number }; Returns: { order_id: number; paid_at: string; table_no: number; amount: number }[] };
    };
    Enums: {
      order_status: "RECEBIDO" | "EM_PREPARO" | "PRONTO" | "ENTREGUE" | "AGUARDANDO_PAGAMENTO" | "PAGO" | "CANCELADO";
      table_status: "LIVRE" | "OCUPADA" | "AGUARDANDO_PAGAMENTO";
      staff_role: "ADMIN" | "ATENDENTE" | "COZINHA";
      customer_visit_status: "AGUARDANDO_MESA" | "MESA_ASSOCIADA" | "ENCERRADA" | "CANCELADA";
    };
    CompositeTypes: Record<string, never>;
  };
};
