// Consultas ao conteúdo, equivalentes aos QuerySets do site Django.
import { getCollection, getEntry, type CollectionEntry } from "astro:content";

export type Produto = CollectionEntry<"produtos">;
export type Categoria = CollectionEntry<"categorias">;

const porOrdem = <T extends { data: { ordem: number; nome: string } }>(a: T, b: T) =>
  a.data.ordem - b.data.ordem || a.data.nome.localeCompare(b.data.nome, "pt-BR");

async function unico<C extends "empresa" | "diferenciais" | "contato" | "cesta">(colecao: C) {
  const [entrada] = await getCollection(colecao);
  if (!entrada) throw new Error(`Arquivo src/content/site/${colecao}.json não encontrado.`);
  return entrada.data as CollectionEntry<C>["data"];
}

export async function empresa() {
  const e = await unico("empresa");
  const telefones = e.telefones.filter((t) => t.ativo);
  return {
    ...e,
    telefones,
    whatsapp: telefones.find((t) => t.whatsapp),
    emails: e.emails.filter((x) => x.ativo),
    enderecos: e.enderecos.filter((x) => x.ativo),
    redes: e.redes.filter((x) => x.ativo),
    horarios: e.horarios.filter((x) => x.ativo),
  };
}
export type Empresa = Awaited<ReturnType<typeof empresa>>;

export const diferenciais = async () => (await unico("diferenciais")).itens.filter((d) => d.ativo);
export const assuntos = async () => (await unico("contato")).assuntos.filter((a) => a.ativo);

export async function opcoesCesta() {
  const c = await unico("cesta");
  return { tamanhos: c.tamanhos.filter((t) => t.ativo), lacos: c.lacos.filter((l) => l.ativo) };
}

export const categorias = async () => (await getCollection("categorias", (c) => c.data.ativo)).sort(porOrdem);

export async function colecoesMenu() {
  return (await getCollection("colecoes", (c) => c.data.no_menu)).sort(porOrdem);
}

/** Produtos ativos de categorias ativas, ordenados como no admin antigo, já com a categoria. */
export async function produtos(filtro: (p: Produto) => boolean = () => true) {
  const cats = new Map((await categorias()).map((c) => [c.id, c]));
  return (await getCollection("produtos", (p) => p.data.ativo && cats.has(p.data.categoria.id) && filtro(p)))
    .sort(porOrdem)
    .map((p) => ({ ...p, categoria: cats.get(p.data.categoria.id)! }));
}
export type ProdutoComCategoria = Awaited<ReturnType<typeof produtos>>[number];

/** Carrossel ativo com os banners publicados agora (o navegador refaz o filtro de datas). */
export async function carrossel(id: string | undefined) {
  if (!id) return undefined;
  const c = await getEntry("carrosseis", id);
  if (!c || !c.data.ativo) return undefined;
  const agora = new Date();
  const banners = c.data.banners.filter((b) => b.ativo && !(b.fim && b.fim < agora));
  return banners.length ? { id: c.id, ...c.data, banners } : undefined;
}
