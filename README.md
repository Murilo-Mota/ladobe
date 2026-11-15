# Empório Lado Bê — site para Cloudflare

Site institucional e vitrine em **Astro**, publicado no **Cloudflare Workers**, com painel de conteúdo
(**Decap CMS**) em `/admin/`. É a versão do site Django antigo (pasta acima desta) com o mesmo visual e
as mesmas funções.

| Antes (Django) | Agora |
| --- | --- |
| Django admin em `/admin/` | Decap CMS em `/admin/` (login com GitHub) |
| Banco `db.sqlite3` | Arquivos JSON em `src/content/` (versionados no GitHub) |
| Pasta `media/` | `src/assets/uploads/` (otimizadas para WebP no build) |
| Páginas geradas a cada visita | Páginas geradas a cada publicação (mais rápidas e sem custo) |
| Cesta na sessão do servidor | Cesta no navegador do visitante (localStorage) |
| Mensagens salvas no banco | Mensagens enviadas por e-mail (Cloudflare Email Routing) |
| HTMX | Scripts próprios em `src/scripts/` e transições nativas do navegador |

## Como funciona a publicação

1. Alguém edita algo em `/admin/` e clica em **Publicar**.
2. O CMS grava a alteração no repositório do GitHub (um commit).
3. O Cloudflare percebe o commit, roda `npm run build` e publica. Leva cerca de 1 a 2 minutos.

## Rodar no computador

Requer **Node.js 22.23.4 ou mais novo**.

```powershell
npm install
npm run dev        # site em http://localhost:4321
npm run cms        # (outro terminal) permite usar o /admin/ local sem login
```

Com os dois rodando, `http://localhost:4321/admin/` edita os arquivos direto no seu computador.

Outros comandos: `npm run build` (gera `dist/`), `npm run preview` (build + roda no runtime do Cloudflare),
`npm run check` (verifica tipos), `npm run types` (atualiza os tipos após mudar o `wrangler.jsonc`).

## O que se altera pelo /admin/

| Quero alterar | Onde |
| --- | --- |
| Banners de qualquer página, tempo, transição e autoplay | Banners e carrosséis |
| Publicar banner em um período | Banner → Exibir a partir de / Exibir até |
| Logo, CNPJ, texto de O Empório, mapa | Empresa e configurações → Dados da empresa |
| Telefones, e-mails, endereços, redes, horários | Mesma tela de Dados da empresa |
| Diferenciais da faixa | Empresa e configurações → Diferenciais |
| Assuntos do formulário | Empresa e configurações → Assuntos do formulário |
| Produtos, categorias e itens do menu | Produtos, Categorias, Coleções (menu) |
| Tamanhos de cesta e cores de laço | Empresa e configurações → Monte sua Cesta |
| Tirar um produto do Monte sua Cesta | Produto → "Disponível no Monte sua Cesta" |

- Listas (banners, telefones, diferenciais, tamanhos...) seguem a ordem em que aparecem: arraste para reordenar.
- Envie a imagem original; o build gera versões WebP leves. Tamanhos sugeridos: banner 1920 × 720,
  banner de celular 900 × 1100, categoria 800 × 500, produto 1000 × 1000.
- Banner sem textos é exibido como arte pronta; se tiver link, o banner inteiro fica clicável.
- Cada página usa o carrossel com o mesmo identificador (nome do arquivo): `home`, `produtos`,
  `monte-sua-cesta`, `o-emporio`, `contato`. Coleções escolhem o seu carrossel.
- Para usar um carrossel em outra página: `<Carrossel id="identificador" />`.

## Colocar no ar (uma vez só)

1. **GitHub**: o código está em https://github.com/Murilo-Mota/ladobe (a raiz do repositório é esta pasta `site/`).
2. **Cloudflare → Workers & Pages → Create → Import a repository**: escolha o repositório.
   Build command `npm run build`, deploy command `npx wrangler deploy`. O arquivo `.node-version` fixa o Node 22.23.5.
3. **Domínio**: em *Settings → Domains & Routes* do Worker, adicione o seu domínio.
   Atualize `site` em `astro.config.mjs` com esse endereço.
4. **Login do /admin/** — crie um *OAuth App* em GitHub → Settings → Developer settings:
   - Homepage URL: `https://SEU-DOMINIO`
   - Authorization callback URL: `https://SEU-DOMINIO/api/callback/`
   - No Cloudflare (Worker → Settings → Variables and Secrets), crie os segredos
     `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`.
   - Quem for editar precisa ter acesso de escrita ao repositório.
5. **E-mail do formulário**: no domínio, ative *Email Routing*, verifique o e-mail que vai receber as
   mensagens e ajuste em `wrangler.jsonc` `CONTATO_REMETENTE`, `CONTATO_DESTINO` e
   `send_email.destination_address` (os dois últimos iguais).

## Estrutura

- `src/content/`: conteúdo editado pelo CMS (JSON). O formato está em `src/content.config.ts`.
- `src/assets/uploads/`: imagens enviadas pelo CMS.
- `src/pages/`: páginas; `src/pages/api/`: formulário de contato e login do CMS (rodam no Worker).
- `src/components/`, `src/layouts/`: partes do visual (equivalentes aos templates Django).
- `src/scripts/site.ts`: carrossel, menu, modal de produto, filtros e formulário; `cesta.ts`: Monte sua Cesta.
- `src/styles/site.css`: o mesmo CSS do site antigo.
- `public/admin/`: painel Decap CMS (`config.yml` define os campos).
- `scripts/importar_django.py`: copia de novo os dados do `db.sqlite3` antigo (sobrescreve `src/content`).

Ícones novos: acrescente em `src/lib/icones.ts` e na lista "Ícone" de `public/admin/config.yml`.
