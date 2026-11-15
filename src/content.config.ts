// Estrutura do conteúdo editado pelo /admin/ (public/admin/config.yml).
// Cada coleção corresponde a uma pasta de arquivos JSON em src/content/.
import { defineCollection, reference, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { CHAVES_ICONES } from "./lib/icones";

/** O CMS grava "" ou null em campos vazios; aqui eles viram "ausente". */
const vazio = (v: unknown) => (v === "" || v === null ? undefined : v);
const opcional = <T extends z.ZodType>(schema: T) => z.preprocess(vazio, schema.optional());
const texto = z.string().default("");
const ativo = z.boolean().default(true);
const ordem = z.number().default(0);
const icone = z.enum(CHAVES_ICONES);

const arquivoUnico = (nome: string) => glob({ pattern: `${nome}.json`, base: "./src/content/site" });
const pasta = (nome: string) => glob({ pattern: "*.json", base: `./src/content/${nome}` });

const empresa = defineCollection({
  loader: arquivoUnico("empresa"),
  schema: ({ image }: SchemaContext) =>
    z.object({
      nome_fantasia: z.string(),
      razao_social: texto,
      cnpj: texto,
      slogan: texto,
      logo: opcional(image()),
      sobre_titulo: texto,
      sobre_texto: texto,
      sobre_imagem: opcional(image()),
      mapa_url: texto,
      telefones: z
        .array(z.object({ rotulo: texto, numero: z.string(), whatsapp: z.boolean().default(false), ativo }))
        .default([]),
      emails: z.array(z.object({ rotulo: texto, email: z.string(), ativo })).default([]),
      enderecos: z
        .array(
          z.object({
            rotulo: texto,
            logradouro: texto,
            numero: texto,
            complemento: texto,
            bairro: texto,
            cidade: texto,
            uf: texto,
            cep: texto,
            ativo,
          }),
        )
        .default([]),
      redes: z.array(z.object({ rede: z.string(), url: z.string(), ativo })).default([]),
      horarios: z.array(z.object({ dias: z.string(), horario: z.string(), ativo })).default([]),
    }),
});

const diferenciais = defineCollection({
  loader: arquivoUnico("diferenciais"),
  schema: z.object({
    itens: z.array(z.object({ titulo: z.string(), descricao: texto, icone: icone.default("estrela"), ativo })).default([]),
  }),
});

const contato = defineCollection({
  loader: arquivoUnico("contato"),
  schema: z.object({ assuntos: z.array(z.object({ nome: z.string(), ativo })).default([]) }),
});

const cesta = defineCollection({
  loader: arquivoUnico("cesta"),
  schema: z.object({
    tamanhos: z
      .array(
        z.object({
          nome: z.string(),
          descricao: texto,
          capacidade: opcional(z.number().int().positive()),
          preco: opcional(z.number().nonnegative()),
          ativo,
        }),
      )
      .default([]),
    lacos: z
      .array(z.object({ nome: z.string(), cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c9a14a"), ativo }))
      .default([]),
  }),
});

const carrosseis = defineCollection({
  loader: pasta("carrosseis"),
  schema: ({ image }: SchemaContext) =>
    z.object({
      nome: z.string(),
      tamanho: z.enum(["hero", "faixa"]).default("hero"),
      transicao: z.enum(["fade", "slide"]).default("fade"),
      autoplay: z.boolean().default(true),
      intervalo: z.number().int().min(2).max(30).default(6),
      ativo,
      banners: z
        .array(
          z.object({
            imagem: image(),
            imagem_mobile: opcional(image()),
            foco: z.enum(["center", "right center", "left center", "center top", "center bottom"]).default("center"),
            sobretitulo: texto,
            titulo: texto,
            titulo_destaque: texto,
            texto,
            texto_botao: texto,
            link: texto,
            ativo,
            inicio: opcional(z.coerce.date()),
            fim: opcional(z.coerce.date()),
          }),
        )
        .default([]),
    }),
});

const categorias = defineCollection({
  loader: pasta("categorias"),
  schema: ({ image }: SchemaContext) =>
    z.object({ nome: z.string(), descricao: texto, icone: icone.default("cacau"), imagem: image(), ordem, ativo }),
});

const colecoes = defineCollection({
  loader: pasta("colecoes"),
  schema: z.object({
    nome: z.string(),
    titulo: texto,
    categorias: z.array(reference("categorias")).default([]),
    carrossel: opcional(reference("carrosseis")),
    no_menu: z.boolean().default(true),
    ordem,
  }),
});

const produtos = defineCollection({
  loader: pasta("produtos"),
  schema: ({ image }: SchemaContext) =>
    z.object({
      nome: z.string(),
      categoria: reference("categorias"),
      resumo: texto,
      descricao: texto,
      imagem: image(),
      imagens: z.array(image()).default([]),
      preco: opcional(z.number().nonnegative()),
      destaque: z.boolean().default(false),
      disponivel_na_cesta: z.boolean().default(true),
      ativo,
      ordem,
    }),
});

export const collections = { empresa, diferenciais, contato, cesta, carrosseis, categorias, colecoes, produtos };
