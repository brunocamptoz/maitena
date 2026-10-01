import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protege /admin: renueva la sesión del administrador y manda al login a quien no la tiene.
 * ES SOLO LA PRIMERA BARRERA (comodidad y velocidad): cada página y cada acción del panel vuelve a
 * comprobar en el servidor que el usuario es administrador (ver lib/admin/auth.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Valida la firma de la sesión y la renueva si hace falta.
  const { data } = await supabase.auth.getClaims().catch(() => ({ data: null }));
  const { pathname, search } = request.nextUrl;

  if (!data?.claims && pathname !== "/admin/login") {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(login);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
