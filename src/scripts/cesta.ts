// Monte sua Cesta: estado no navegador (localStorage), etapas pela URL (?etapa=) e envio pelo WhatsApp.

interface Dados {
  empresa: string;
  whatsapp: string | null;
  etapas: { slug: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  produtos: { id: string; nome: string; categoria: string; preco: number | null; foto: string }[];
  tamanhos: { nome: string; capacidade: number | null; preco: number | null }[];
  lacos: { nome: string; cor: string }[];
}
interface Estado { itens: Record<string, number>; tamanho: string | null; laco: string | null; obs: string }

const CHAVE = "cesta";
const QTD_MAXIMA = 99;
const OBS_MAXIMO = 500;

function iniciar(raiz: HTMLElement, elDados: HTMLElement) {
  const dados: Dados = JSON.parse(elDados.textContent!);
  const produtos = new Map(dados.produtos.map((p) => [p.id, p]));
  const slugs = dados.etapas.map((e) => e.slug);
  const $ = <T extends Element = HTMLElement>(sel: string) => raiz.querySelector<T>(sel)!;
  const $$ = <T extends Element = HTMLElement>(sel: string) => [...raiz.querySelectorAll<T>(sel)];

  const moeda = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reais = (v: number) => `R$ ${moeda.format(v)}`;
  const escapar = (t: string) =>
    t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

  /* ---------- Estado ---------- */

  function carregar(): Estado {
    let salvo: Partial<Estado> = {};
    try {
      salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    } catch {}
    // Descarta produtos e opções que saíram do site desde a última visita.
    const itens: Record<string, number> = {};
    for (const [id, qtd] of Object.entries(salvo.itens ?? {})) {
      const n = Math.min(QTD_MAXIMA, Math.floor(Number(qtd)));
      if (produtos.has(id) && n > 0) itens[id] = n;
    }
    return {
      itens,
      tamanho: dados.tamanhos.some((t) => t.nome === salvo.tamanho) ? salvo.tamanho! : null,
      laco: dados.lacos.some((l) => l.nome === salvo.laco) ? salvo.laco! : null,
      obs: String(salvo.obs ?? "").slice(0, OBS_MAXIMO),
    };
  }

  let estado = carregar();
  const salvar = () => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {}
  };

  function resumo() {
    // Mesma ordem do catálogo: categoria, depois produto.
    const itens = dados.produtos
      .filter((p) => estado.itens[p.id])
      .map((p) => ({ produto: p, qtd: estado.itens[p.id], subtotal: p.preco === null ? null : p.preco * estado.itens[p.id] }));
    const tamanho = dados.tamanhos.find((t) => t.nome === estado.tamanho) ?? null;
    const laco = dados.lacos.find((l) => l.nome === estado.laco) ?? null;
    let valor = itens.reduce((s, i) => s + (i.subtotal ?? 0), 0);
    if (tamanho?.preco != null) valor += tamanho.preco;
    const total = itens.reduce((s, i) => s + i.qtd, 0);
    return {
      itens,
      total,
      valor,
      sobConsulta: itens.some((i) => i.subtotal === null),
      tamanho,
      laco,
      excede: Boolean(tamanho?.capacidade && total > tamanho.capacidade),
    };
  }
  type Resumo = ReturnType<typeof resumo>;

  function mensagemWhatsapp(r: Resumo) {
    const linhas = [`Olá! Montei uma cesta no site do ${dados.empresa}:`, "", "*Itens*"];
    r.itens.forEach((i) => linhas.push(`• ${i.qtd}× ${i.produto.nome}`));
    linhas.push("", `*Total de itens:* ${r.total}`);
    if (r.tamanho) linhas.push(`*Tamanho da cesta:* ${r.tamanho.nome}`);
    if (r.laco) linhas.push(`*Cor do laço:* ${r.laco.nome}`);
    if (r.valor) linhas.push(`*Valor estimado:* ${reais(r.valor)}${r.sobConsulta ? " + itens sob consulta" : ""}`);
    if (estado.obs.trim()) linhas.push("", "*Observações:*", estado.obs.trim());
    return linhas.join("\n");
  }

  /* ---------- Tela ---------- */

  const etapaDaUrl = () => {
    const slug = new URLSearchParams(location.search).get("etapa") ?? "";
    return slugs.includes(slug) ? slug : slugs[0];
  };

  const amostra = (cor: string) => `<span class="laco__amostra laco__amostra--mini" style="--cor:${escapar(cor)}"></span>`;

  function desenhar() {
    const etapa = etapaDaUrl();
    const indice = slugs.indexOf(etapa);
    const r = resumo();

    // Etapa visível e barra de etapas
    $$("[data-etapa]").forEach((el) => (el.hidden = el.dataset.etapa !== etapa));
    $$<HTMLAnchorElement>(".passos [data-ir]").forEach((a) => {
      const i = slugs.indexOf(a.dataset.ir!);
      a.classList.toggle("passo--feito", i < indice);
      if (i === indice) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    });
    const porCategoria: Record<string, number> = {};
    r.itens.forEach((i) => (porCategoria[i.produto.categoria] = (porCategoria[i.produto.categoria] ?? 0) + i.qtd));
    $$("[data-qtd-categoria]").forEach((el) => {
      const qtd = porCategoria[el.dataset.qtdCategoria!] ?? 0;
      el.hidden = !qtd;
      el.textContent = String(qtd);
      el.setAttribute("aria-label", `${qtd} itens`);
    });
    const passos = $(".passos");
    const atual = passos.querySelector<HTMLElement>("[aria-current]");
    if (atual) passos.scrollLeft = atual.offsetLeft - (passos.clientWidth - atual.offsetWidth) / 2;

    // Quantidades
    $$("[data-item]").forEach((el) => {
      const qtd = estado.itens[el.dataset.item!] ?? 0;
      el.classList.toggle("item-cesta--ativo", qtd > 0);
      el.querySelector("output")!.textContent = String(qtd);
      el.querySelector<HTMLButtonElement>('[data-acao="menos"]')!.disabled = !qtd;
      el.querySelector<HTMLButtonElement>('[data-acao="mais"]')!.disabled = qtd >= QTD_MAXIMA;
    });

    // Opções (tamanho, laço, observações)
    const form = raiz.querySelector<HTMLFormElement>("[data-opcoes]");
    if (form) {
      form.querySelectorAll<HTMLInputElement>('input[name="tamanho"]').forEach((i) => (i.checked = i.value === estado.tamanho));
      form.querySelectorAll<HTMLInputElement>('input[name="laco"]').forEach((i) => (i.checked = i.value === estado.laco));
      const obs = form.querySelector<HTMLTextAreaElement>("textarea")!;
      if (document.activeElement !== obs) obs.value = estado.obs;
      form.querySelectorAll<HTMLElement>("[data-capacidade]").forEach((b) => {
        b.hidden = r.total <= Number(b.dataset.capacidade);
        b.textContent = `Pequena para ${r.total} itens`;
      });
    }

    desenharResumo(r, etapa);
    desenharRevisao(r);
  }

  function desenharResumo(r: Resumo, etapa: string) {
    const lista = $("[data-resumo-itens]");
    lista.innerHTML = r.itens.map((i) => `<li><span>${i.qtd}×</span> ${escapar(i.produto.nome)}</li>`).join("");
    lista.hidden = !r.itens.length;
    $("[data-resumo-vazio]").hidden = r.itens.length > 0;
    $("[data-resumo-tamanho]").textContent = r.tamanho?.nome ?? "—";
    $("[data-resumo-laco]").innerHTML = r.laco ? amostra(r.laco.cor) + escapar(r.laco.nome) : "—";
    $("[data-resumo-total]").textContent = String(r.total);
    $("[data-resumo-rotulo]").textContent = r.total === 1 ? "item" : "itens";
    const valor = $("[data-resumo-valor]");
    valor.hidden = !r.valor;
    valor.innerHTML = r.valor ? reais(r.valor) + (r.sobConsulta ? "<small>+ sob consulta</small>" : "") : "";
    const excede = $("[data-resumo-excede]");
    excede.hidden = !r.excede;
    excede.textContent = r.excede ? `Acima da capacidade da cesta ${r.tamanho!.nome}.` : "";
    $("[data-resumo-revisar]").hidden = etapa === "revisar";
  }

  function desenharRevisao(r: Resumo) {
    $("[data-revisao-cheia]").hidden = !r.itens.length;
    $("[data-revisao-vazia]").hidden = r.itens.length > 0;
    if (!r.itens.length) return;

    const link = (slug: string) => `<a href="?etapa=${slug}" data-ir="${slug}">Editar</a>`;
    const grupos = dados.categorias
      .map((c) => ({ categoria: c, itens: r.itens.filter((i) => i.produto.categoria === c.id) }))
      .filter((g) => g.itens.length)
      .map(
        (g) => `
      <section class="revisao__grupo">
        <header><h4>${escapar(g.categoria.nome)}</h4>${link(g.categoria.id)}</header>
        <ul>${g.itens
          .map(
            (i) => `<li>
            <img src="${escapar(i.produto.foto)}" alt="" loading="lazy">
            <span class="revisao__nome">${escapar(i.produto.nome)}</span>
            <span class="revisao__qtd">${i.qtd}×</span>
            <span class="revisao__valor">${i.subtotal === null ? "" : reais(i.subtotal)}</span>
          </li>`,
          )
          .join("")}</ul>
      </section>`,
      )
      .join("");

    const obs = estado.obs.trim() ? escapar(estado.obs.trim()).replace(/\n/g, "<br>") : "Nenhuma";
    $("[data-revisao]").innerHTML = `${grupos}
      <section class="revisao__grupo">
        <header><h4>Detalhes da cesta</h4>${link("cesta")}</header>
        <dl class="revisao__detalhes">
          <dt>Tamanho</dt><dd>${r.tamanho ? escapar(r.tamanho.nome) : "Não escolhido"}</dd>
          <dt>Laço</dt><dd>${r.laco ? amostra(r.laco.cor) + escapar(r.laco.nome) : "Não escolhido"}</dd>
          <dt>Observações</dt><dd>${obs}</dd>
        </dl>
      </section>
      <div class="revisao__total">
        <span>Total de itens <strong>${r.total}</strong></span>
        ${r.valor ? `<span>Valor estimado <strong>${reais(r.valor)}</strong>${r.sobConsulta ? "<small> + itens sob consulta</small>" : ""}</span>` : ""}
      </div>
      ${r.excede ? `<p class="aviso">A cesta ${escapar(r.tamanho!.nome)} comporta até ${r.tamanho!.capacidade} itens. Escolha um tamanho maior ou confirme pelo WhatsApp.</p>` : ""}`;

    const enviar = raiz.querySelector<HTMLAnchorElement>("[data-enviar]");
    if (enviar && dados.whatsapp) enviar.href = `https://wa.me/${dados.whatsapp}?text=${encodeURIComponent(mensagemWhatsapp(r))}`;
  }

  /* ---------- Eventos ---------- */

  function irPara(slug: string) {
    const url = new URL(location.href);
    url.searchParams.set("etapa", slug);
    history.pushState(null, "", url);
    desenhar();
    $("#cesta-etapa").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  raiz.addEventListener("click", (e) => {
    const alvo = e.target as HTMLElement;
    const ir = alvo.closest<HTMLElement>("[data-ir]");
    if (ir) {
      e.preventDefault();
      irPara(ir.dataset.ir!);
      return;
    }
    const botao = alvo.closest<HTMLButtonElement>("[data-acao]");
    if (botao) {
      const id = botao.closest<HTMLElement>("[data-item]")!.dataset.item!;
      const qtd = Math.max(0, Math.min(QTD_MAXIMA, (estado.itens[id] ?? 0) + (botao.dataset.acao === "mais" ? 1 : -1)));
      if (qtd) estado.itens[id] = qtd;
      else delete estado.itens[id];
      salvar();
      desenhar();
      return;
    }
    if (alvo.closest("[data-limpar]")) {
      estado = { itens: {}, tamanho: null, laco: null, obs: "" };
      salvar();
      irPara(slugs[0]);
    }
  });

  const form = raiz.querySelector<HTMLFormElement>("[data-opcoes]");
  form?.addEventListener("change", (e) => {
    const campo = e.target as HTMLInputElement;
    if (campo.name === "tamanho") estado.tamanho = campo.value;
    if (campo.name === "laco") estado.laco = campo.value;
    salvar();
    desenhar();
  });
  form?.addEventListener("input", (e) => {
    const campo = e.target as HTMLTextAreaElement;
    if (campo.name !== "obs") return;
    estado.obs = campo.value.slice(0, OBS_MAXIMO);
    salvar();
  });
  form?.addEventListener("submit", (e) => e.preventDefault());

  addEventListener("popstate", desenhar);
  // Outra aba alterou a cesta.
  addEventListener("storage", (e) => {
    if (e.key === CHAVE) {
      estado = carregar();
      desenhar();
    }
  });

  desenhar();
}

const montador = document.querySelector<HTMLElement>("[data-montador]");
const dadosCesta = document.getElementById("dados-cesta");
if (montador && dadosCesta) iniciar(montador, dadosCesta);
