// Segredos definidos no painel do Cloudflare (não aparecem no wrangler.jsonc, por isso são declarados aqui).
declare namespace Cloudflare {
  interface Env {
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
  }
}
