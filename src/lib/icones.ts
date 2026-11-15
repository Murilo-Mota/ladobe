// Ícones de traço usados no site; as chaves aparecem como opções no /admin/
// (mantenha a lista "icone" de public/admin/config.yml igual a esta).
export const ICONES = {
  cacau: [
    "Cacau",
    '<path d="M12 3c-5 3-8 8-7 12 1 3.5 4 6 7 6s6-2.500 7-6c1-4-2-9-7-12Z"/><path d="M12 3v18M7.500 9 12 12l4.500-3M5.500 14 12 18l6.500-4"/>',
  ],
  taca: ["Taça", '<path d="M7 3h10v6a5 5 0 0 1-10 0V3Z"/><path d="M7 8h10M12 14v7M8 21h8"/>'],
  folhas: [
    "Folhas",
    '<path d="M12 20C5 18 2 12 3 5c6 0 10 3 9 15Z"/><path d="M12 20c7-2 10-8 9-15-6 0-10 3-9 15Z"/><path d="M6 8c2 3 4 7 6 12M18 8c-2 3-4 7-6 12"/>',
  ],
  pote: [
    "Pote",
    '<rect x="6" y="3" width="12" height="4" rx="1"/><path d="M7 7c-1 1-2 2-2 4v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8c0-2-1-3-2-4"/><rect x="8" y="12" width="8" height="5" rx=".5"/>',
  ],
  presente: [
    "Presente",
    '<rect x="4" y="10" width="16" height="11" rx="1"/><rect x="3" y="7" width="18" height="3" rx=".5"/><path d="M12 7v14M12 7C10 3 6 3 7 6c.4 1 3 1 5 1ZM12 7c2-4 6-4 5-1-.4 1-3 1-5 1Z"/>',
  ],
  estrela: ["Estrela", '<path d="M12 2c1 6 3 9 9 10-6 1-8 4-9 10-1-6-3-9-9-10 6-1 8-4 9-10Z"/>'],
  xicara: [
    "Xícara",
    '<path d="M4 10h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-5Z"/><path d="M17 11h1.500a2.500 2.500 0 0 1 0 5H17"/><path d="M8 3c-1 1.500 1 2.500 0 4M12 3c-1 1.500 1 2.500 0 4"/>',
  ],
  coracao: ["Coração", '<path d="M12 21C5 15 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 7-10 13Z"/>'],
} as const;

export type NomeIcone = keyof typeof ICONES;
export const CHAVES_ICONES = Object.keys(ICONES) as [NomeIcone, ...NomeIcone[]];

export function svgIcone(nome: string, classe = "") {
  const dados = ICONES[nome as NomeIcone];
  if (!dados) return "";
  return (
    `<svg class="icone ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.300" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dados[1]}</svg>`
  );
}
