"""Copia o conteúdo do site Django antigo (db.sqlite3 + media/) para os arquivos JSON do site Astro.

Uso, a partir da pasta site/:
    python scripts/importar_django.py            # lê ../db.sqlite3 e ../media
    python scripts/importar_django.py CAMINHO_DO_PROJETO_DJANGO

Sobrescreve os arquivos de src/content e src/assets/uploads com o que estiver no banco.
Mensagens de contato não são migradas (no site novo elas chegam por e-mail).
"""

import json
import shutil
import sqlite3
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DJANGO = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else SITE.parent
CONTEUDO = SITE / "src" / "content"
UPLOADS = SITE / "src" / "assets" / "uploads"
# Caminho gravado nos JSON: relativo a src/content/<pasta>/arquivo.json (o mesmo que o CMS grava).
PREFIXO = "../../assets/uploads/"

db = sqlite3.connect(DJANGO / "db.sqlite3")
db.row_factory = sqlite3.Row
copiados: dict[str, str] = {}


def linhas(sql, *args):
    return [dict(r) for r in db.execute(sql, args)]


def imagem(caminho):
    """Copia um arquivo de media/ para uploads/ e devolve o caminho usado no JSON."""
    if not caminho:
        return ""
    if caminho in copiados:
        return copiados[caminho]
    origem = DJANGO / "media" / caminho
    if not origem.exists():
        print(f"  aviso: imagem não encontrada: {origem}")
        return ""
    nome = origem.name
    if (UPLOADS / nome).exists():
        nome = f"{origem.parent.name}-{nome}"
    shutil.copy2(origem, UPLOADS / nome)
    copiados[caminho] = PREFIXO + nome
    return copiados[caminho]


def gravar(pasta, nome, dados):
    destino = CONTEUDO / pasta / f"{nome}.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def data_iso(valor):
    return valor.replace(" ", "T") if valor else ""


def preco(valor):
    return float(valor) if valor is not None else None


def main():
    for pasta in ["carrosseis", "categorias", "colecoes", "produtos"]:
        shutil.rmtree(CONTEUDO / pasta, ignore_errors=True)
    shutil.rmtree(UPLOADS, ignore_errors=True)
    UPLOADS.mkdir(parents=True)

    empresa = (linhas("select * from empresa_empresa where id = 1") or [{}])[0]
    ordem = "order by ordem, id"
    gravar("site", "empresa", {
        "nome_fantasia": empresa.get("nome_fantasia") or "Empório Lado Bê",
        "razao_social": empresa.get("razao_social", ""),
        "cnpj": empresa.get("cnpj", ""),
        "slogan": empresa.get("slogan", ""),
        "logo": imagem(empresa.get("logo")),
        "sobre_titulo": empresa.get("sobre_titulo", ""),
        "sobre_texto": (empresa.get("sobre_texto") or "").replace("\r\n", "\n"),
        "sobre_imagem": imagem(empresa.get("sobre_imagem")),
        "mapa_url": empresa.get("mapa_url", ""),
        "telefones": [
            {"rotulo": t["rotulo"], "numero": t["numero"], "whatsapp": bool(t["whatsapp"]), "ativo": bool(t["ativo"])}
            for t in linhas(f"select * from empresa_telefone {ordem}")
        ],
        "emails": [
            {"rotulo": e["rotulo"], "email": e["email"], "ativo": bool(e["ativo"])}
            for e in linhas(f"select * from empresa_email {ordem}")
        ],
        "enderecos": [
            {k: e[k] for k in ["rotulo", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "cep"]}
            | {"ativo": bool(e["ativo"])}
            for e in linhas(f"select * from empresa_endereco {ordem}")
        ],
        "redes": [
            {"rede": r["rede"], "url": r["url"], "ativo": bool(r["ativo"])}
            for r in linhas(f"select * from empresa_redesocial {ordem}")
        ],
        "horarios": [
            {"dias": h["dias"], "horario": h["horario"], "ativo": bool(h["ativo"])}
            for h in linhas(f"select * from empresa_horariofuncionamento {ordem}")
        ],
    })

    gravar("site", "diferenciais", {"itens": [
        {"titulo": d["titulo"], "descricao": d["descricao"], "icone": d["icone"], "ativo": bool(d["ativo"])}
        for d in linhas(f"select * from empresa_diferencial {ordem}")
    ]})

    gravar("site", "contato", {"assuntos": [
        {"nome": a["nome"], "ativo": bool(a["ativo"])}
        for a in linhas("select * from empresa_assuntocontato order by ordem, nome")
    ]})

    gravar("site", "cesta", {
        "tamanhos": [
            {"nome": t["nome"], "descricao": t["descricao"], "capacidade": t["capacidade"], "preco": preco(t["preco"]),
             "ativo": bool(t["ativo"])}
            for t in linhas(f"select * from cesta_tamanhocesta {ordem}")
        ],
        "lacos": [
            {"nome": c["nome"], "cor": c["cor"], "ativo": bool(c["ativo"])}
            for c in linhas(f"select * from cesta_corlaco {ordem}")
        ],
    })

    slug_carrossel = {c["id"]: c["slug"] for c in linhas("select id, slug from banners_carrossel")}
    for c in linhas("select * from banners_carrossel"):
        banners = linhas("select * from banners_banner where carrossel_id = ? order by ordem, id", c["id"])
        gravar("carrosseis", c["slug"], {
            "nome": c["nome"],
            "tamanho": c["tamanho"],
            "transicao": c["transicao"],
            "autoplay": bool(c["autoplay"]),
            "intervalo": c["intervalo"],
            "ativo": bool(c["ativo"]),
            "banners": [
                {
                    "imagem": imagem(b["imagem"]),
                    "imagem_mobile": imagem(b["imagem_mobile"]),
                    "foco": b["foco"],
                    **{k: b[k] for k in ["sobretitulo", "titulo", "titulo_destaque", "texto", "texto_botao", "link"]},
                    "ativo": bool(b["ativo"]),
                    "inicio": data_iso(b["inicio"]),
                    "fim": data_iso(b["fim"]),
                }
                for b in banners
            ],
        })

    slug_categoria = {}
    for c in linhas("select * from catalogo_categoria"):
        slug_categoria[c["id"]] = c["slug"]
        gravar("categorias", c["slug"], {
            "nome": c["nome"], "descricao": c["descricao"], "icone": c["icone"],
            "imagem": imagem(c["imagem"]), "ordem": c["ordem"], "ativo": bool(c["ativo"]),
        })

    for c in linhas("select * from catalogo_colecao"):
        categorias = linhas("select categoria_id from catalogo_colecao_categorias where colecao_id = ?", c["id"])
        gravar("colecoes", c["slug"], {
            "nome": c["nome"],
            "titulo": c["titulo"],
            "categorias": [slug_categoria[x["categoria_id"]] for x in categorias],
            "carrossel": slug_carrossel.get(c["carrossel_id"], ""),
            "no_menu": bool(c["no_menu"]),
            "ordem": c["ordem"],
        })

    for p in linhas("select * from catalogo_produto"):
        extras = linhas("select imagem from catalogo_produtoimagem where produto_id = ? order by ordem, id", p["id"])
        gravar("produtos", p["slug"], {
            "nome": p["nome"],
            "categoria": slug_categoria[p["categoria_id"]],
            "resumo": p["resumo"],
            "descricao": (p["descricao"] or "").replace("\r\n", "\n"),
            "imagem": imagem(p["imagem"]),
            "imagens": [imagem(x["imagem"]) for x in extras],
            "preco": preco(p["preco"]),
            "destaque": bool(p["destaque"]),
            "disponivel_na_cesta": bool(p["disponivel_na_cesta"]),
            "ativo": bool(p["ativo"]),
            "ordem": p["ordem"],
        })

    print(f"Importado de {DJANGO}: {len(copiados)} imagens.")


if __name__ == "__main__":
    main()
