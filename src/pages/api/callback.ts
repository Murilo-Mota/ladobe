// Login do /admin/ (Decap CMS) com GitHub: passo 2, troca o código pelo token e devolve à janela do CMS.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

function resposta(status: "success" | "error", conteudo: object) {
  const mensagem = JSON.stringify(`authorization:github:${status}:${JSON.stringify(conteudo)}`);
  // Protocolo do Decap: a janela avisa que está pronta e responde a quem a abriu.
  const html = `<!doctype html><meta charset="utf-8"><title>Entrando…</title><script>
    (function () {
      function receber(e) {
        window.opener.postMessage(${mensagem}, e.origin);
        window.removeEventListener("message", receber);
      }
      window.addEventListener("message", receber);
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = env;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const esperado = cookies.get("oauth_state")?.value;
  cookies.delete("oauth_state", { path: "/api/" });

  if (!code || !state || state !== esperado) return resposta("error", { message: "Login inválido ou expirado. Tente de novo." });

  const r = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "decap-cms-auth" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
  });
  const dados = (await r.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!dados.access_token) return resposta("error", { message: dados.error_description || "Falha ao autenticar no GitHub." });
  return resposta("success", { token: dados.access_token, provider: "github" });
};
