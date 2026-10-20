// Embute dist/base-normativa.json num arquivo HTML do app (entre /*BASE-INI*/ e /*BASE-FIM*/).
// Uso: node scripts/embutir.mjs caminho/para/ronda-sst.html
import { readFileSync, writeFileSync } from "node:fs";
const raiz = new URL("..", import.meta.url).pathname;
const alvo = process.argv[2];
if (!alvo) { console.error("Informe o arquivo HTML do app."); process.exit(1); }
const base = JSON.parse(readFileSync(raiz + "dist/base-normativa.json", "utf8"));
const html = readFileSync(alvo, "utf8");
const re = /\/\*BASE-INI\*\/[\s\S]*?\/\*BASE-FIM\*\//;
if (!re.test(html)) { console.error("Marcadores /*BASE-INI*/ e /*BASE-FIM*/ não encontrados."); process.exit(1); }
const novo = html.replace(re, () => `/*BASE-INI*/const BASE_EMB=${JSON.stringify(base).replace(/<\/script/gi, "<\\/script")};/*BASE-FIM*/`);
writeFileSync(alvo, novo);
console.log(`Base ${base.versao} embutida em ${alvo}`);
