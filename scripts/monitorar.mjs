// Vigia as páginas oficiais listadas em monitor/fontes.json.
// Compara com monitor/estado.json e escreve monitor/relatorio.md quando algo mudou.
// Sai com código 0 sempre; o workflow decide abrir a issue se o relatório existir.
// Uso: node scripts/monitorar.mjs
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";

const raiz = new URL("..", import.meta.url).pathname;
const lerJ = (p) => JSON.parse(readFileSync(raiz + p, "utf8"));
const h = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const { fontes } = lerJ("monitor/fontes.json");
const estado = existsSync(raiz + "monitor/estado.json") ? lerJ("monitor/estado.json") : {};
const man = lerJ("manifesto.json");
const relatorio = raiz + "monitor/relatorio.md";
if (existsSync(relatorio)) rmSync(relatorio);

function extrair(html, base) {
  const limpo = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  // Links para documentos (PDF, notas técnicas, leiautes, portarias): são o sinal mais estável de mudança.
  const links = [...limpo.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(([, href, txt]) => ({ href: new URL(href, base).href, txt: txt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }))
    .filter((l) => /\.pdf($|\?)|nota[-\s]?t[eé]cnica|leiaute|portaria|tabela|\bnr[-\s]?\d+/i.test(l.href + " " + l.txt));
  const docs = [...new Map(links.map((l) => [l.href, l])).values()].sort((a, b) => a.href.localeCompare(b.href));
  // Texto principal, sem menus e rodapés comuns do gov.br.
  const main = (limpo.match(/<main[\s\S]*?<\/main>/i) || limpo.match(/<div[^>]+id="content"[\s\S]*/i) || [limpo])[0];
  const texto = main.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return { docs, texto };
}

const mudancas = [], falhas = [], agora = new Date().toISOString();
for (const f of fontes) {
  try {
    const r = await fetch(f.url, { headers: { "user-agent": "base-normativa-sst/1.0 (monitor semanal)" }, redirect: "follow" });
    if (!r.ok) { falhas.push({ f, msg: `HTTP ${r.status}` }); continue; }
    const { docs, texto } = extrair(await r.text(), f.url);
    const novo = { hashDocs: h(JSON.stringify(docs.map((d) => d.href))), hashTexto: h(texto), docs: docs.map((d) => d.href), verificado: agora };
    const ant = estado[f.id];
    if (ant) {
      const entraram = docs.filter((d) => !ant.docs.includes(d.href));
      const sairam = ant.docs.filter((u) => !docs.some((d) => d.href === u));
      if (entraram.length || sairam.length || ant.hashTexto !== novo.hashTexto)
        mudancas.push({ f, entraram, sairam, soTexto: !entraram.length && !sairam.length });
      novo.desde = ant.hashTexto === novo.hashTexto && ant.hashDocs === novo.hashDocs ? ant.desde : agora;
    } else novo.desde = agora;
    estado[f.id] = novo;
  } catch (e) { falhas.push({ f, msg: e.message }); }
}
writeFileSync(raiz + "monitor/estado.json", JSON.stringify(estado, null, 1) + "\n");

if (mudancas.length || falhas.length) {
  const afetados = (id) => man.itens.filter((i) => (i.monitor || []).includes(id)).map((i) => `\`${i.id}\` (${i.titulo})`);
  let md = `Execução de ${agora.slice(0, 10)}.\n\n`;
  for (const m of mudancas) {
    md += `### ${m.f.nome}\n${m.f.url}\n\n`;
    if (m.entraram.length) md += `**Documentos novos na página:**\n${m.entraram.map((d) => `- [${d.txt || d.href}](${d.href})`).join("\n")}\n\n`;
    if (m.sairam.length) md += `**Documentos que saíram da página:**\n${m.sairam.map((u) => `- ${u}`).join("\n")}\n\n`;
    if (m.soTexto) md += `O texto da página mudou, sem documento novo. Pode ser só ajuste de layout; vale uma olhada rápida.\n\n`;
    md += `**Itens da base que podem ser afetados:** ${afetados(m.f.id).join(", ") || "nenhum"}\n\n`;
  }
  for (const x of falhas) md += `### ⚠ Não foi possível ler: ${x.f.nome}\n${x.f.url} — ${x.msg}\nConfira se o endereço mudou e atualize \`monitor/fontes.json\`.\n\n`;
  md += `---\n**O que fazer:** baixe o documento oficial novo para \`fontes/pdf/\`, peça ao Claude para extrair e comparar com a versão atual, revise a diferença e só então marque o item como \`conferido\` com a nova versão e vigência.\n`;
  writeFileSync(relatorio, md);
  console.log(md);
} else console.log("Nenhuma mudança nas fontes monitoradas.");
