// Comportamentos do site: carrossel, menu, modal de produto, filtros da listagem e formulário de contato.

const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DURACAO_TRANSICAO = 950;
const carregando = () => document.getElementById("carregando");

/* ---------- Carrossel ---------- */

function iniciarCarrossel(raiz: HTMLElement) {
  // Banners com data de início/fim: o site é gerado antes, então o filtro final é feito aqui.
  const agora = Date.now();
  let slides = [...raiz.querySelectorAll<HTMLElement>("[data-slide]")];
  let pontos = [...raiz.querySelectorAll<HTMLElement>("[data-ponto]")];
  slides.forEach((slide, i) => {
    const { inicio, fim } = slide.dataset;
    if ((inicio && Date.parse(inicio) > agora) || (fim && Date.parse(fim) < agora)) {
      slide.remove();
      pontos[i]?.remove();
    }
  });
  slides = slides.filter((s) => s.isConnected);
  pontos = pontos.filter((p) => p.isConnected);
  if (!slides.length) return raiz.remove();
  if (slides.length < 2) raiz.querySelectorAll(".seta, .pontos").forEach((el) => el.remove());

  let atual = 0;
  slides.forEach((slide, i) => {
    slide.classList.toggle("ativo", i === 0);
    slide.inert = i !== 0;
    slide.setAttribute("aria-label", `${i + 1} de ${slides.length}`);
  });
  pontos.forEach((ponto, i) => ponto.classList.toggle("ativo", i === 0));
  if (slides.length < 2) return;

  function ir(destino: number, direcao: number) {
    const proximo = (destino + slides.length) % slides.length;
    if (proximo === atual) return;
    const anterior = slides[atual];
    const novo = slides[proximo];

    // Posiciona o novo slide no lado de entrada antes de animar.
    novo.style.transition = "none";
    raiz.style.setProperty("--dir", String(direcao));
    void novo.offsetWidth;
    novo.style.transition = "";

    slides.forEach((s) => s.classList.remove("saindo"));
    anterior.classList.remove("ativo");
    anterior.classList.add("saindo");
    anterior.inert = true;
    novo.classList.add("ativo");
    novo.inert = false;
    setTimeout(() => anterior.classList.remove("saindo"), DURACAO_TRANSICAO);

    pontos[atual]?.classList.remove("ativo");
    pontos[proximo]?.classList.add("ativo");
    atual = proximo;
  }

  const avancar = () => ir(atual + 1, 1);
  const voltar = () => ir(atual - 1, -1);

  // A animação da barrinha é o relógio: pausar o CSS também pausa o carrossel.
  if (raiz.dataset.autoplay === "1" && !movimentoReduzido) {
    raiz.classList.add("automatico");
    raiz.addEventListener("animationend", (e) => {
      if (e.animationName === "progresso") avancar();
    });
  }

  const pausar = () => raiz.classList.add("pausado");
  const retomar = () => {
    if (!raiz.matches(":hover") && !raiz.contains(document.activeElement)) raiz.classList.remove("pausado");
  };
  raiz.addEventListener("mouseenter", pausar);
  raiz.addEventListener("mouseleave", retomar);
  raiz.addEventListener("focusin", pausar);
  raiz.addEventListener("focusout", () => setTimeout(retomar));

  raiz.addEventListener("click", (e) => {
    const alvo = e.target as Element;
    if (alvo.closest("[data-proximo]")) avancar();
    else if (alvo.closest("[data-anterior]")) voltar();
    else {
      const ponto = alvo.closest<HTMLElement>("[data-ponto]");
      if (ponto) {
        const i = pontos.indexOf(ponto);
        ir(i, i > atual ? 1 : -1);
      }
    }
  });

  raiz.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") avancar();
    if (e.key === "ArrowLeft") voltar();
  });

  let inicioX: number | null = null;
  raiz.addEventListener("pointerdown", (e) => { inicioX = e.clientX; });
  raiz.addEventListener("pointerup", (e) => {
    if (inicioX === null) return;
    const distancia = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(distancia) > 50) (distancia < 0 ? avancar : voltar)();
  });
}

/* ---------- Listagem de produtos: categoria, busca e "Carregar mais" ---------- */

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

function iniciarListagem(raiz: HTMLElement) {
  const form = raiz.querySelector<HTMLFormElement>("[data-filtros]")!;
  const cartoes = [...raiz.querySelectorAll<HTMLElement>("[data-produto]")];
  const mais = raiz.querySelector<HTMLElement>("[data-mais]")!;
  const vazio = raiz.querySelector<HTMLElement>("[data-vazio]")!;
  const porPagina = Number(raiz.dataset.porPagina) || 12;
  let limite = porPagina;

  // Aplica os filtros vindos da URL (links como /produtos/?categoria=chocolates).
  const params = new URLSearchParams(location.search);
  const categoriaInicial = params.get("categoria") ?? "";
  const radio = form.querySelector<HTMLInputElement>(`input[name="categoria"][value="${CSS.escape(categoriaInicial)}"]`);
  if (radio) radio.checked = true;
  form.q.value = params.get("q") ?? "";

  function aplicar(atualizarUrl: boolean) {
    const categoria = (form.querySelector<HTMLInputElement>('input[name="categoria"]:checked')?.value) ?? "";
    const busca = normalizar(form.q.value);
    const visiveis = cartoes.filter(
      (c) => (!categoria || c.dataset.categoria === categoria) && (!busca || c.dataset.busca!.includes(busca)),
    );
    cartoes.forEach((c) => (c.hidden = true));
    visiveis.slice(0, limite).forEach((c) => (c.hidden = false));
    mais.hidden = visiveis.length <= limite;
    vazio.hidden = visiveis.length > 0;

    if (atualizarUrl) {
      const url = new URL(location.href);
      url.search = "";
      if (categoria) url.searchParams.set("categoria", categoria);
      if (form.q.value.trim()) url.searchParams.set("q", form.q.value.trim());
      history.replaceState(history.state, "", url);
    }
  }

  let espera: number | undefined;
  form.addEventListener("change", () => { limite = porPagina; aplicar(true); });
  form.addEventListener("input", (e) => {
    if ((e.target as HTMLInputElement).type !== "search") return;
    clearTimeout(espera);
    espera = window.setTimeout(() => { limite = porPagina; aplicar(true); }, 300);
  });
  form.addEventListener("submit", (e) => { e.preventDefault(); aplicar(true); });
  mais.addEventListener("click", () => { limite += porPagina; aplicar(false); });
  aplicar(false);
}

/* ---------- Modal de produto ---------- */

async function abrirProduto(link: HTMLAnchorElement) {
  const modal = document.getElementById("modal") as HTMLDialogElement;
  carregando()?.classList.add("ativo");
  try {
    const resposta = await fetch(link.href);
    if (!resposta.ok) throw new Error(String(resposta.status));
    const pagina = new DOMParser().parseFromString(await resposta.text(), "text/html");
    const detalhe = pagina.querySelector(".detalhe");
    if (!detalhe) throw new Error("sem conteúdo");
    modal.innerHTML = '<button class="modal__fechar" type="button" data-modal-fechar aria-label="Fechar">×</button>' + detalhe.outerHTML;
    if (!modal.open) modal.showModal();
  } catch {
    location.href = link.href;
  } finally {
    carregando()?.classList.remove("ativo");
  }
}

/* ---------- Formulário de contato ---------- */

function iniciarContato(form: HTMLFormElement) {
  const sucesso = form.querySelector<HTMLElement>("[data-sucesso]")!;
  const falha = form.querySelector<HTMLElement>("[data-falha]")!;
  const params = new URLSearchParams(location.search);
  sucesso.hidden = params.get("enviado") !== "1";
  falha.hidden = params.get("erro") !== "1";

  function mostrarErros(erros: Record<string, string>) {
    form.querySelectorAll<HTMLElement>("[data-campo]").forEach((campo) => {
      const erro = erros[campo.dataset.campo!];
      const aviso = campo.querySelector("small")!;
      campo.classList.toggle("campo--erro", Boolean(erro));
      aviso.hidden = !erro;
      aviso.textContent = erro ?? "";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    sucesso.hidden = falha.hidden = true;
    const erros: Record<string, string> = {};
    for (const nome of ["nome", "email", "mensagem"]) {
      const campo = form.elements.namedItem(nome) as HTMLInputElement;
      if (!campo.value.trim()) erros[nome] = "Este campo é obrigatório.";
      else if (!campo.checkValidity()) erros[nome] = "Informe um endereço de e-mail válido.";
    }
    mostrarErros(erros);
    if (Object.keys(erros).length) return;

    const botao = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
    botao.disabled = true;
    carregando()?.classList.add("ativo");
    try {
      const resposta = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      const dados = (await resposta.json().catch(() => ({}))) as { ok?: boolean; erros?: Record<string, string> };
      if (dados.ok) {
        form.reset();
        sucesso.hidden = false;
      } else if (dados.erros) {
        mostrarErros(dados.erros);
      } else {
        falha.hidden = false;
      }
    } catch {
      falha.hidden = false;
    } finally {
      botao.disabled = false;
      carregando()?.classList.remove("ativo");
    }
  });
}

/* ---------- Inicialização ---------- */

document.querySelectorAll<HTMLElement>("[data-carrossel]").forEach(iniciarCarrossel);
document.querySelectorAll<HTMLElement>("[data-listagem]").forEach(iniciarListagem);
document.querySelectorAll<HTMLFormElement>("[data-form-contato]").forEach(iniciarContato);
document.querySelectorAll<HTMLElement>("[data-ano]").forEach((el) => (el.textContent = String(new Date().getFullYear())));

document.addEventListener("click", (e) => {
  const alvo = e.target as HTMLElement;
  const alternar = alvo.closest("[data-menu-alternar]");
  if (alternar) {
    const aberto = alternar.getAttribute("aria-expanded") !== "true";
    alternar.setAttribute("aria-expanded", String(aberto));
    alternar.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    return;
  }

  const modal = document.getElementById("modal") as HTMLDialogElement | null;
  if (alvo.closest("[data-modal-fechar]") || alvo.id === "modal") {
    modal?.close();
    return;
  }

  const produto = alvo.closest<HTMLAnchorElement>("a[data-modal-produto]");
  if (produto && modal && !(e as MouseEvent).ctrlKey && !(e as MouseEvent).metaKey && !(e as MouseEvent).shiftKey) {
    e.preventDefault();
    abrirProduto(produto);
    return;
  }

  const mini = alvo.closest<HTMLElement>("[data-galeria-mini]");
  if (mini) {
    mini.closest("[data-galeria]")!.querySelector<HTMLImageElement>("[data-galeria-principal]")!.src = mini.dataset.galeriaMini!;
  }
});

addEventListener("scroll", () => {
  document.querySelector("[data-topo]")?.classList.toggle("topo--compacto", scrollY > 40);
}, { passive: true });
