// Extrai a Tabela 24 e a Tabela 27 do "Anexo I - Tabelas" dos leiautes do eSocial.
// Lê o PDF mais recente baixado em fontes/bruto/, grava os CSVs em tabelas/esocial/,
// guarda uma cópia do PDF em fontes/pdf/ e escreve fontes/bruto/resumo.md com as diferenças.
// Requer pdftotext (poppler-utils). Uso: node scripts/extrair.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { lerCSV } from "./csv.mjs";

const raiz = new URL("..", import.meta.url).pathname;
const aviso = (m) => console.log((process.env.GITHUB_ACTIONS ? "::notice::" : "") + m);
const bruto = raiz + "fontes/bruto/";

function acharPDFs(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = dir + n;
    return statSync(p).isDirectory() ? acharPDFs(p + "/") : /Anexo I - Tabelas.*\.pdf$/i.test(n) ? [p] : [];
  });
}
const pdfs = existsSync(bruto) ? acharPDFs(bruto) : [];
if (!pdfs.length) { aviso("Nenhum PDF do Anexo I - Tabelas em fontes/bruto/."); process.exit(0); }
const pdf = pdfs.sort().pop();
const nomePdf = pdf.split("/").pop();
const versao = (nomePdf.match(/\(([^)]+)\)/) || [, ""])[1];          // ex.: cons. até NT 07.2026 rev. 20.10.2026
const leiaute = (nomePdf.match(/v\.\s*(S-[\d.]+)/i) || [, ""])[1];   // ex.: S-1.3
const rev = versao.match(/rev\.?\s*(\d{2})\.(\d{2})\.(\d{4})/);
const dataRev = rev ? `${rev[3]}-${rev[2]}-${rev[1]}` : new Date().toISOString().slice(0, 10);
const texto = execFileSync("pdftotext", ["-layout", pdf, "-"], { maxBuffer: 1 << 28 }).toString("utf8");
const linhas = texto.split(/\r?\n/);

function secao(num) {
  // O sumário cita a tabela sem recuo; no corpo o título vem centralizado (com espaços à esquerda).
  const ini = linhas.findIndex((l) => new RegExp(`^\\s{3,}Tabela ${num} - `).test(l));
  if (ini < 0) throw new Error(`Tabela ${num} não encontrada no PDF`);
  let fim = linhas.findIndex((l, i) => i > ini && /^\s{3,}Tabela \d+ - /.test(l) && !new RegExp(`Tabela ${num} - `).test(l));
  return linhas.slice(ini, fim < 0 ? undefined : fim);
}

function parse(ls, reCod, comGrupos) {
  const out = []; let atual = null, pend = [], grupo = "", sub = "";
  const fecha = () => { if (atual) { atual.descricao = atual.partes.join(" ").replace(/\s+/g, " ").trim(); delete atual.partes; out.push(atual); } atual = null; };
  const CATS = /^(QUÍMICOS|FÍSICOS|BIOLÓGICOS|ASSOCIAÇÃO|OUTROS AGENTES|AUSÊNCIA)/;
  for (const l of ls) {
    const t = l.trim();
    if (/^Tabela \d+ - /.test(t) || /^CÓDIGO\s/.test(t)) continue;
    if (!t) { fecha(); pend = []; continue; }
    const m = l.match(new RegExp(`^\\s*(${reCod})(?:\\s+(.*))?$`));
    if (m) { fecha(); atual = { codigo: m[1], partes: [...pend, m[2] || ""], ...(comGrupos ? { grupo, subgrupo: sub } : {}) }; pend = []; continue; }
    if (comGrupos && !/[a-zà-ÿ]/.test(t) && /[A-ZÀ-Þ]{3}/.test(t)) {
      fecha(); pend = [];
      if (CATS.test(t)) { grupo = t.charAt(0) + t.slice(1).toLowerCase(); sub = ""; } else sub = t.charAt(0) + t.slice(1).toLowerCase();
      continue;
    }
    if (atual) atual.partes.push(t); else pend.push(t);
  }
  fecha();
  return out;
}

const q = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s);
const tabelas = [
  { id: "esocial-tabela-24", num: 24, arq: "tabelas/esocial/tabela-24.csv", re: "\\d{2}\\.\\d{2}\\.\\d{3}", grupos: true, colunas: ["codigo", "descricao", "grupo", "subgrupo"] },
  { id: "esocial-tabela-27", num: 27, arq: "tabelas/esocial/tabela-27.csv", re: "\\d{4}", grupos: false, colunas: ["codigo", "descricao"] },
];

mkdirSync(raiz + "fontes/pdf", { recursive: true });
const destPdf = `fontes/pdf/eSocial-${leiaute || "leiaute"}-Anexo-I-Tabelas-${dataRev}.pdf`;
copyFileSync(pdf, raiz + destPdf);

const man = JSON.parse(readFileSync(raiz + "manifesto.json", "utf8"));
let resumo = `Fonte: **${nomePdf}**\n\nCópia guardada em \`${destPdf}\`.\n\n`;
for (const tb of tabelas) {
  const novos = parse(secao(tb.num), tb.re, tb.grupos);
  const vistos = new Set(); const dup = novos.filter((r) => vistos.has(r.codigo) || !vistos.add(r.codigo));
  if (dup.length) throw new Error(`Tabela ${tb.num}: códigos repetidos ${dup.map((d) => d.codigo).join(", ")}`);
  if (novos.length < 10) throw new Error(`Tabela ${tb.num}: só ${novos.length} linhas reconhecidas; o layout do PDF pode ter mudado`);
  const antigos = existsSync(raiz + tb.arq) ? lerCSV(readFileSync(raiz + tb.arq, "utf8")).linhas : [];
  const ma = Object.fromEntries(antigos.map((r) => [r.codigo, r]));
  const entraram = novos.filter((r) => !ma[r.codigo]);
  const sairam = antigos.filter((r) => !novos.some((n) => n.codigo === r.codigo));
  const mudaram = novos.filter((r) => ma[r.codigo] && ma[r.codigo].descricao !== r.descricao);
  writeFileSync(raiz + tb.arq, [tb.colunas.join(","), ...novos.map((r) => tb.colunas.map((c) => q(r[c] ?? "")).join(","))].join("\n") + "\n");
  const it = man.itens.find((i) => i.id === tb.id);
  const mudou = entraram.length || sairam.length || mudaram.length || it.status === "aguardando-fonte";
  if (mudou) Object.assign(it, {
    colunas: tb.colunas, status: "rascunho", versao: `${leiaute} ${versao}`.trim(),
    vigencia: { inicio: dataRev, fim: "" }, conferido: { por: "", em: "" },
    fonte: { ...it.fonte, ato: `Leiautes do eSocial ${leiaute} – Anexo I: Tabelas (${versao})`, pdf: destPdf },
  });
  resumo += `### Tabela ${tb.num} – ${novos.length} códigos\n`;
  if (!antigos.length) resumo += `Primeira carga.\n\n`;
  else {
    resumo += `${entraram.length} novo(s), ${sairam.length} removido(s), ${mudaram.length} com descrição alterada.\n\n`;
    const lista = (t, l, f) => (l.length ? `**${t}:**\n${l.slice(0, 50).map(f).join("\n")}${l.length > 50 ? `\n… e mais ${l.length - 50}` : ""}\n\n` : "");
    resumo += lista("Novos", entraram, (r) => `- \`${r.codigo}\` ${r.descricao}`);
    resumo += lista("Removidos", sairam, (r) => `- \`${r.codigo}\` ${r.descricao}`);
    resumo += lista("Alterados", mudaram, (r) => `- \`${r.codigo}\`: “${ma[r.codigo].descricao}” → “${r.descricao}”`);
  }
  aviso(`Tabela ${tb.num}: ${novos.length} códigos (${entraram.length} novos, ${sairam.length} removidos, ${mudaram.length} alterados)`);
}
writeFileSync(raiz + "manifesto.json", JSON.stringify(man, null, 2) + "\n");
writeFileSync(bruto + "resumo.md", resumo);
