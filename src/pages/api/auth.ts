// Login do /admin/ (Decap CMS) com GitHub: passo 1, envia a pessoa para autorizar o app.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const GET: APIRoute = ({ url, cookies }) => {
  const { GITHUB_CLIENT_ID } = env;
  if (!GITHUB_CLIENT_ID) return new Response("Defina o segredo GITHUB_CLIENT_ID no Cloudflare.", { status: 500 });

  const state = crypto.randomUUID();
  cookies.set("oauth_state", state, { path: "/api/", httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", maxAge: 600 });

  const destino = new URL("https://github.com/login/oauth/authorize");
  destino.searchParams.set("client_id", GITHUB_CLIENT_ID);
  destino.searchParams.set("redirect_uri", new URL("/api/callback/", url).href);
  destino.searchParams.set("scope", url.searchParams.get("scope") || "repo,user");
  destino.searchParams.set("state", state);
  return Response.redirect(destino.href, 302);
};
