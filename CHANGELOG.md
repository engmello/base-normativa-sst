# Histórico da base normativa

## 2026-10-27 – textos oficiais das NRs base do app
- Registro em `fontes/normas.json` (endereço, data, tamanho e hash) dos PDFs do MTE baixados: NR-01 (texto de 2025, com o manual e as perguntas e respostas do GRO/PGR de 2026), NR-04, NR-05, NR-06, NR-07 (consolidada de 2022), NR-09, NR-10, NR-12, NR-15, NR-16, NR-17, NR-18, NR-33 e NR-35. Os PDFs ficam só na pasta local `fontes/pdf/` (fora do git) até decidir onde guardar.
- Itens da matriz do PGR, `nr01-pgr`, ruído, calor, vibração, catálogo de perigos e anexos NR-15/NR-16 passam a apontar para o endereço oficial da norma.
- `pgr-matrizes` cita os itens da NR-01 conferidos no texto oficial (1.5.4.4.2.1, 1.5.4.4.2.2, 1.5.4.4.4.1 e 1.5.4.4.5.1 a 1.5.4.4.5.4); a 4×4 orienta considerar a eficácia das medidas ao escolher a frequência.
- Monitor `mte-nrs`: endereço confirmado.

## 2026-10-27 – matrizes de risco alternativas para o PGR (rascunho)
- Novo item `pgr-matrizes`: matrizes que a conta pode escolher em cada PGR, além da padrão. A NR-01 (1.5.4.4.2) exige critério documentado, não fixa a matriz; escolher a matriz do PGR anterior mantém as avaliações numa revisão.
- Primeira alternativa: `efeito-frequencia-4x4` — tabela efeito (Leve, Moderado, Sério, Severo) × frequência (Ocasional, Intermitente, Habitual, Permanente), classes Irrelevante a Crítico com aceitabilidade e prazo; é a matriz dos cartões de risco do ARMS antes da fusão.
- `pgr-matriz` ganha `id` (`efeito-perfil-5x5`), `nome` e `tipo`; valores sem mudança.
- `validar.mjs` confere as tabelas (dimensões, classes e casos de teste).

## 2026-10-26 – NR-07 conferida com o texto oficial (rascunho 2026.2)
- PDFs de origem em `fontes/pdf/`: NR-07 consolidada (Portaria SEPRT 6.734/2020) e Portaria MTP 567/2022.
- `nr07-exames-por-agente`: audiometria sem o exame "6 meses após a admissão" (Anexo II, 4.1: admissão, anual, demissão); radiografia e espirometria citam o Anexo III; sílica/asbesto/carvão com radiografia a cada 2 anos sem avaliação quantitativa (Quadro 1); poeira de baixa toxicidade (PNOS) com radiografia a cada 5 anos (Quadro 2); novas regras de tolueno (orto-cresol na urina) e xileno (ácido metilhipúrico), semestrais (7.5.13); toxicológico com o §6º do art. 168 da CLT.
- `nr07-prazos`: audiometria corrigida; novos prazos de indicadores biológicos (6 meses, ±45 dias, fora dos demais exames — 7.5.13 a 7.5.15), espirometria para poeiras minerais e exames complementares aceitos até 90 dias antes da admissão (7.5.17).
- Status continua **rascunho** até a conferência do responsável técnico.

## 2026-10-22 – parâmetros do PGR (rascunho)
- Novo item `nr01-pgr`: revisão do inventário a cada 24 meses (NR-01, 1.5.4.4.6) e as 3 dimensões dos fatores de riscos psicossociais (Portaria MTE 1.419/2024) com perigo e danos padrão. Status: **rascunho**.

## 2026-10-21 – catálogo de perigos e anexos NR-15/NR-16 (rascunho)
- Novo item `catalogo-perigos`: 21 perigos iniciais com código da Tabela 24, avaliação, limite de tolerância, trajetória, efeito sugerido, danos, medidas e orientação de código (ex.: fumos de solda → informar o metal). Radiação não ionizante e poeira incômoda marcadas como **não** agente nocivo da Tabela 24. Transcrito do Ronda SST — conferir com NR-09, NR-15 e NHO 01.
- Novo item `nr15-nr16-anexos`: anexos da NR-15 (insalubridade) e da NR-16 (periculosidade) para indicação no GHE.
- Status: **rascunho**.

## 2026-10-21 – Tabelas 24 e 27 conferidas
- Tabela 24 (92 códigos) e Tabela 27 (1.450 códigos), versão S-1.3 consolidada até a NT 07/2026 rev. 20/10/2026, conferidas com o PDF oficial por Osni Ribeiro Mello. Status: conferido.

## 2026-10-20 – extração automática
- Novo robô de extração: descobre a nota técnica mais recente do eSocial, baixa o pacote, extrai as Tabelas 24 e 27 do Anexo I e abre uma proposta de mudança para revisão.

## 2026-10-20 – estrutura inicial
- Criados o manifesto, a validação, a geração do `dist/` e o monitoramento semanal das fontes oficiais.
- Tabela 24 e Tabela 27 do eSocial: estrutura criada, **aguardando o PDF oficial**.
- Matriz do PGR, critérios de ruído, calor e vibração, exames por agente e prazos da NR-07: transcritos do Ronda SST como **rascunho**, a conferir com as normas.
