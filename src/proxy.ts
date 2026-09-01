import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: ((cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }) satisfies SetAllCookies,
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/funcionario/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  const { data } = await supabase.from("staff_profiles").select("active").eq("user_id", user.id).maybeSingle();
  const profile = data as { active: boolean } | null;
  if (!profile?.active) {
    const unauthorizedUrl = request.nextUrl.clone();
    unauthorizedUrl.pathname = "/funcionario/sem-acesso";
    unauthorizedUrl.search = "";
    return NextResponse.redirect(unauthorizedUrl);
  }
  return response;
}

export const config = {
  matcher: ["/funcionario/painel/:path*", "/funcionario/cardapio/:path*", "/funcionario/pedido/:path*"],
};
