# Base normativa SST

Fonte única das tabelas, parâmetros e regras normativas que o **Ronda SST** consulta para funcionar: Tabela 24 e Tabela 27 do eSocial, matriz de risco do PGR, critérios de ruído, calor e vibração, exames por agente e prazos da NR-07.

O app nunca usa uma regra "de memória": tudo o que é normativo vem daqui, com fonte, versão e vigência.

## Estrutura

| Pasta / arquivo | O que guarda |
|---|---|
| `manifesto.json` | A lista de itens da base: fonte oficial, ato normativo, versão, vigência, status, quem conferiu e onde o app usa |
| `fontes/pdf/` | Os PDFs oficiais de origem (prova da origem de cada tabela) |
| `tabelas/` | Tabelas codificadas em CSV (`codigo,descricao`) |
| `parametros/` | Limites, fórmulas e critérios (JSON) |
| `regras/` | Regras derivadas das normas, como exames sugeridos por agente (JSON) |
| `dist/` | Gerado automaticamente: `base-normativa.json` (o que o app carrega) e `versao.json` (o que o app consulta para saber se há atualização) |
| `monitor/` | Páginas oficiais vigiadas e o estado da última verificação |
| `CHANGELOG.md` | O que mudou em cada atualização |

## Status de cada item

- **aguardando-fonte**: a estrutura existe, falta o documento oficial. O app não usa.
- **rascunho**: dados extraídos, ainda não conferidos com a fonte. O app usa com aviso.
- **conferido**: conferido item a item pelo responsável técnico. Tabela conferida exige o PDF oficial em `fontes/pdf/`.

## Como funciona a atualização

1. **Toda segunda-feira** o robô (`.github/workflows/monitorar.yml`) lê as páginas oficiais de `monitor/fontes.json`. Se aparecer documento novo (nota técnica, leiaute, portaria) ou o endereço quebrar, ele abre uma **issue** com os itens da base que podem ser afetados.
2. O responsável baixa o documento novo para `fontes/pdf/` e pede ao Claude para extrair a tabela e comparar com a versão atual.
3. A mudança entra por **pull request**: o robô de validação confere formato, códigos repetidos, vigência e os casos de teste da matriz.
4. Depois de revisada, o item recebe a nova `versao`, a `vigencia` e `conferido.por` / `conferido.em`, e o status vira `conferido`.
5. Ao entrar na `main`, o robô gera o `dist/` com a nova versão da base.
6. O app compara a versão que está usando com `dist/versao.json`, mostra o que mudou e aplica a atualização. Cada documento emitido grava a versão da base usada.

## Regras

- Nenhum dado entra como `conferido` sem a fonte oficial.
- A vigência é registrada: um documento emitido continua mostrando a versão da base vigente na data de emissão.
- **Direitos autorais:** NRs, tabelas do eSocial, decretos e NHOs da Fundacentro são públicos. Normas ABNT (NBR) e limites da ACGIH são protegidos: aqui fica só a referência, nunca o texto ou a tabela.

## Comandos

```bash
node scripts/validar.mjs    # confere manifesto e dados
node scripts/build.mjs      # gera dist/
node scripts/monitorar.mjs  # verifica as fontes oficiais (o robô roda isso toda semana)
node scripts/embutir.mjs ronda-sst.html  # grava a base atual dentro do app
```

Não há dependências: só Node 20 ou mais recente.
