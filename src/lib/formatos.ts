const moeda = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1234.5 → "R$ 1.234,50" */
export const reais = (valor: number) => `R$ ${moeda.format(valor)}`;

export const digitos = (numero: string) => numero.replace(/\D/g, "");

/** Número no formato do wa.me, acrescentando o DDI do Brasil se faltar. */
export function whatsappDigitos(numero: string) {
  const d = digitos(numero);
  return d.startsWith("55") && d.length > 11 ? d : `55${d}`;
}

export const linkWhatsapp = (numero: string, mensagem?: string) =>
  `https://wa.me/${whatsappDigitos(numero)}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;

/** Texto com linhas em branco → parágrafos; quebras simples → linhas (como o filtro linebreaks do Django). */
export const paragrafos = (texto: string) =>
  texto
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split("\n"));
