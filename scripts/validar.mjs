// Valida o manifesto e os arquivos de dados. Sai com código 1 se houver erro.
// Uso: node scripts/validar.mjs
import { readFileSync, existsSync } from "node:fs";
import { lerCSV } from "./csv.mjs";

const raiz = new URL("..", import.meta.url).pathname;
const ler = (p) => readFileSync(raiz + p, "utf8");
const erros = [], avisos = [];
const STATUS = ["aguardando-fonte", "rascunho", "conferido"];
const TIPOS = ["tabela", "parametro", "regra", "texto"];
const data = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

let man;
try { man = JSON.parse(ler("manifesto.json")); } catch (e) { console.error("manifesto.json inválido: " + e.message); process.exit(1); }
const fontes = JSON.parse(ler("monitor/fontes.json")).fontes.map((f) => f.id);
const ids = new Set();

for (const it of man.itens) {
  const p = `[${it.id}]`;
  if (!it.id || ids.has(it.id)) erros.push(`${p} id ausente ou repetido`); ids.add(it.id);
  if (!TIPOS.includes(it.tipo)) erros.push(`${p} tipo inválido: ${it.tipo}`);
  if (!STATUS.includes(it.status)) erros.push(`${p} status inválido: ${it.status}`);
  if (!it.fonte?.ato) erros.push(`${p} falta fonte.ato (norma ou documento de origem)`);
  if (!existsSync(raiz + it.arquivo)) { erros.push(`${p} arquivo não encontrado: ${it.arquivo}`); continue; }
  for (const m of it.monitor || []) if (!fontes.includes(m)) erros.push(`${p} monitor desconhecido: ${m}`);

  if (it.status !== "aguardando-fonte") {
    if (!it.versao) erros.push(`${p} falta versão`);
    if (!data(it.vigencia?.inicio || "")) erros.push(`${p} falta início de vigência (AAAA-MM-DD)`);
  }
  if (it.status === "conferido") {
    if (!it.conferido?.por || !data(it.conferido?.em || "")) erros.push(`${p} status "conferido" exige conferido.por e conferido.em`);
    if (it.tipo === "tabela" && !it.fonte?.pdf) erros.push(`${p} tabela conferida exige o PDF oficial em fontes/pdf e o caminho em fonte.pdf`);
  }
  if (it.fonte?.pdf && !existsSync(raiz + it.fonte.pdf)) erros.push(`${p} PDF da fonte não encontrado: ${it.fonte.pdf}`);

  const txt = ler(it.arquivo);
  if (it.arquivo.endsWith(".json")) {
    try { JSON.parse(txt); } catch (e) { erros.push(`${p} JSON inválido: ${e.message}`); }
  } else if (it.arquivo.endsWith(".csv")) {
    const { cabecalho, linhas } = lerCSV(txt);
    if (JSON.stringify(cabecalho) !== JSON.stringify(it.colunas)) erros.push(`${p} cabeçalho do CSV (${cabecalho}) difere de colunas (${it.colunas})`);
    const vistos = new Set();
    linhas.forEach((l, i) => {
      if (it.id.startsWith("esocial-tabela-24") && !/^\d{2}\.\d{2}\.\d{3}$/.test(l.codigo)) erros.push(`${p} linha ${i + 2}: código fora do formato 00.00.000: "${l.codigo}"`);
      if (vistos.has(l.codigo)) erros.push(`${p} linha ${i + 2}: código repetido ${l.codigo}`); vistos.add(l.codigo);
      if (!l.descricao) erros.push(`${p} linha ${i + 2}: descrição vazia`);
    });
    if (it.status !== "aguardando-fonte" && !linhas.length) erros.push(`${p} tabela sem linhas`);
    if (it.status === "aguardando-fonte" && linhas.length) avisos.push(`${p} tem linhas mas está "aguardando-fonte"; mude para "rascunho"`);
  }
  if (it.status === "rascunho") avisos.push(`${p} em rascunho: conferir com a fonte oficial`);
}

// casos de teste da matriz do PGR
try {
  const m = JSON.parse(ler("parametros/pgr-matriz.json"));
  for (const c of m.casosDeTeste) {
    const n = c.efeito * c.perfil;
    const cl = m.quadro2.find((q) => q.ate == null || n <= q.ate).classe;
    if (n !== c.esperado || cl !== c.classe) erros.push(`[pgr-matriz] caso "${c.caso}": deu ${n}/${cl}, esperado ${c.esperado}/${c.classe}`);
  }
} catch (e) { erros.push("[pgr-matriz] " + e.message); }

// matrizes alternativas: id único, tabela completa com classes conhecidas e casos de teste
try {
  const { matrizes } = JSON.parse(ler("parametros/pgr-matrizes.json"));
  const idsMatriz = new Set([JSON.parse(ler("parametros/pgr-matriz.json")).id]);
  for (const m of matrizes) {
    const p = `[pgr-matrizes ${m.id}]`;
    if (idsMatriz.has(m.id)) erros.push(`${p} id repetido`); idsMatriz.add(m.id);
    if (m.tipo !== "tabela") { erros.push(`${p} tipo "${m.tipo}" não suportado (use "tabela")`); continue; }
    const classes = new Set(m.classes.map((c) => c.classe));
    if (m.niveis.length !== m.efeitos.length) erros.push(`${p} ${m.niveis.length} linhas para ${m.efeitos.length} efeitos`);
    m.niveis.forEach((linha, i) => {
      if (linha.length !== m.perfis.length) erros.push(`${p} linha ${i + 1} com ${linha.length} colunas para ${m.perfis.length} perfis`);
      linha.forEach((c) => { if (!classes.has(c)) erros.push(`${p} classe "${c}" fora de classes`); });
    });
    for (const c of m.casosDeTeste || []) {
      const i = m.efeitos.findIndex((e) => e.valor === c.efeito), j = m.perfis.findIndex((x) => x.valor === c.perfil);
      const cl = i < 0 || j < 0 ? "(fora da escala)" : m.niveis[i][j];
      if (cl !== c.classe) erros.push(`${p} caso "${c.caso}": deu ${cl}, esperado ${c.classe}`);
    }
  }
} catch (e) { erros.push("[pgr-matrizes] " + e.message); }

avisos.forEach((a) => console.log("aviso  " + a));
erros.forEach((e) => console.log("ERRO   " + e));
console.log(`\n${man.itens.length} itens · ${erros.length} erro(s) · ${avisos.length} aviso(s)`);
if (erros.length) process.exit(1);
