// Leitor de CSV simples (vírgula, aspas duplas), sem dependências.
export function lerCSV(txt) {
  const linhas = txt.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const campos = (l) => {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
    }
    out.push(cur); return out.map((s) => s.trim());
  };
  const [cab, ...resto] = linhas.map(campos);
  return { cabecalho: cab || [], linhas: resto.map((r) => Object.fromEntries((cab || []).map((k, i) => [k, r[i] ?? ""]))) };
}
