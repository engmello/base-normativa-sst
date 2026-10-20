// Gera dist/base-normativa.json (dados completos que o app carrega)
// e dist/versao.json (arquivo pequeno que o app consulta para saber se há atualização).
// Uso: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { lerCSV } from "./csv.mjs";

const raiz = new URL("..", import.meta.url).pathname;
const ler = (p) => readFileSync(raiz + p, "utf8");
const man = JSON.parse(ler("manifesto.json"));
const h = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

const itens = man.itens.map((it) => {
  const txt = ler(it.arquivo);
  const dados = it.status === "aguardando-fonte" ? null : it.arquivo.endsWith(".csv") ? lerCSV(txt).linhas : JSON.parse(txt);
  const { monitor, ...meta } = it;
  return { ...meta, hash: h(txt + JSON.stringify(meta)), dados };
});

// A versão da base muda sempre que algum item muda (hash do conjunto).
const hashBase = h(itens.map((i) => i.id + ":" + i.hash).join("|"));
const hoje = new Date().toISOString().slice(0, 10);
let anterior = {};
try { anterior = JSON.parse(ler("dist/versao.json")); } catch {}
const versao = anterior.hash === hashBase ? anterior.versao : `${hoje.replace(/-/g, ".")}-${hashBase.slice(0, 6)}`;
const gerado = anterior.hash === hashBase ? anterior.gerado : new Date().toISOString();

const resumo = { versao, hash: hashBase, gerado, itens: Object.fromEntries(itens.map((i) => [i.id, { versao: i.versao, status: i.status, hash: i.hash, titulo: i.titulo }])) };
mkdirSync(raiz + "dist", { recursive: true });
writeFileSync(raiz + "dist/base-normativa.json", JSON.stringify({ nome: man.nome, versao, hash: hashBase, gerado, itens }, null, 1) + "\n");
writeFileSync(raiz + "dist/versao.json", JSON.stringify(resumo, null, 1) + "\n");
console.log(`base ${versao} · ${itens.length} itens · ${itens.filter((i) => i.status === "conferido").length} conferido(s)`);
