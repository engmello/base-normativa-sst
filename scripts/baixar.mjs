// Baixa os documentos de fontes/download.json para fontes/bruto/ e registra url, data e hash.
// Arquivos .zip são extraídos em fontes/bruto/<id>/. Uso: node scripts/baixar.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const raiz = new URL("..", import.meta.url).pathname;
const aviso = (m) => console.log((process.env.GITHUB_ACTIONS ? "::notice::" : "") + m);
const { itens } = JSON.parse(readFileSync(raiz + "fontes/download.json", "utf8"));
const dir = raiz + "fontes/bruto/";
mkdirSync(dir, { recursive: true });
const registro = [];
async function descobrir(d) {
  const r = await fetch(d.pagina, { headers: { "user-agent": "base-normativa-sst/1.0" } });
  if (!r.ok) throw new Error("página de descoberta: HTTP " + r.status);
  const html = await r.text();
  const re = new RegExp(d.padrao, "gi");
  const ord = Object.fromEntries(d.ordem.split(",").map((x) => x.split("=")).map(([k, v]) => [k, +v]));
  const achados = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]).map((href) => { re.lastIndex = 0; const m = re.exec(href); return m && { url: new URL(href.replace(/\/$/, ""), d.pagina).href, ano: +m[ord.ano], numero: +m[ord.numero] }; }).filter(Boolean);
  if (!achados.length) throw new Error("nenhum link casou com o padrão na página " + d.pagina);
  achados.sort((a, b) => a.ano - b.ano || a.numero - b.numero);
  return achados.pop().url;
}
for (const it of itens) {
  try {
    if (it.descobrir) { it.url = await descobrir(it.descobrir); aviso(`link mais recente: ${it.url}`); }
    const r = await fetch(it.url, { headers: { "user-agent": "base-normativa-sst/1.0" }, redirect: "follow" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const tipo = r.headers.get("content-type") || "";
    const ext = /zip/.test(tipo) || it.url.endsWith(".zip") || buf.subarray(0, 2).toString() === "PK" ? "zip" : /pdf/.test(tipo) ? "pdf" : "html";
    const arq = `${it.id}.${ext}`;
    writeFileSync(dir + arq, buf);
    if (ext === "zip") { mkdirSync(dir + it.id, { recursive: true }); execFileSync("unzip", ["-o", "-q", dir + arq, "-d", dir + it.id]); }
    registro.push({ id: it.id, url: it.url, arquivo: "fontes/bruto/" + arq, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), baixado: new Date().toISOString() });
    aviso(`ok   ${it.id} (${buf.length} bytes, ${ext})`);
  } catch (e) { registro.push({ id: it.id, url: it.url, erro: e.message }); aviso(`ERRO ${it.id}: ${e.message}`); }
}
writeFileSync(dir + "registro.json", JSON.stringify(registro, null, 1) + "\n");
