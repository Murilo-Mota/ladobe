// Recebe o formulário de contato e envia por e-mail (Cloudflare Email Routing, binding EMAIL no wrangler.jsonc).
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { EmailMessage } from "cloudflare:email";

export const prerender = false;

const LIMITES = { nome: 120, email: 254, telefone: 25, assunto: 80, mensagem: 5000 } as const;
type Campo = keyof typeof LIMITES;

function validar(dados: Record<Campo, string>) {
  const erros: Partial<Record<Campo, string>> = {};
  for (const campo of ["nome", "email", "mensagem"] as const) {
    if (!dados[campo]) erros[campo] = "Este campo é obrigatório.";
  }
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) erros.email = "Informe um endereço de e-mail válido.";
  for (const [campo, max] of Object.entries(LIMITES) as [Campo, number][]) {
    if (dados[campo].length > max) erros[campo] = `Use no máximo ${max} caracteres.`;
  }
  return erros;
}

/** Codifica um cabeçalho com acentos (RFC 2047). */
const cabecalho = (texto: string) => `=?UTF-8?B?${base64(texto)}?=`;
const base64 = (texto: string) => btoa(String.fromCharCode(...new TextEncoder().encode(texto)));

function montarEmail(de: string, para: string, d: Record<Campo, string>) {
  const corpo = [
    `Nome: ${d.nome}`,
    `E-mail: ${d.email}`,
    `Telefone: ${d.telefone || "—"}`,
    `Assunto: ${d.assunto || "—"}`,
    "",
    d.mensagem,
  ].join("\r\n");
  return [
    `From: ${cabecalho("Site Empório Lado Bê")} <${de}>`,
    `To: <${para}>`,
    `Reply-To: <${d.email.replace(/[<>\r\n]/g, "")}>`,
    `Subject: ${cabecalho(`Contato pelo site: ${d.assunto || d.nome}`)}`,
    `Message-ID: <${crypto.randomUUID()}@${de.split("@")[1]}>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64(corpo).replace(/.{76}/g, "$&\r\n"),
  ].join("\r\n");
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const viaScript = request.headers.get("accept")?.includes("application/json");
  const form = await request.formData();
  const ler = (campo: string) => String(form.get(campo) ?? "").trim();
  const dados = Object.fromEntries((Object.keys(LIMITES) as Campo[]).map((c) => [c, ler(c)])) as Record<Campo, string>;

  const erros = validar(dados);
  if (Object.keys(erros).length) {
    return viaScript ? Response.json({ ok: false, erros }, { status: 400 }) : redirect("/contato/?erro=1", 303);
  }

  // Campo invisível preenchido: é robô. Responde como sucesso e descarta.
  if (!ler("site")) {
    const { EMAIL, CONTATO_REMETENTE: de, CONTATO_DESTINO: para } = env as Partial<Cloudflare.Env>;
    if (EMAIL && de && para) {
      try {
        await EMAIL.send(new EmailMessage(de, para, montarEmail(de, para, dados)));
      } catch (erro) {
        console.error("Falha ao enviar e-mail de contato", erro);
        return viaScript ? Response.json({ ok: false }, { status: 502 }) : redirect("/contato/?erro=1", 303);
      }
    } else {
      console.log("Mensagem de contato (envio de e-mail não configurado):", dados);
    }
  }

  return viaScript ? Response.json({ ok: true }) : redirect("/contato/?enviado=1", 303);
};
