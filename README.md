# CECD-Lab

Página de apresentação do CECD-Lab, laboratório de extensão da Coordenadoria de Estatística e Ciência de Dados (CECD/PROPLAD) da UFPR.

Endereço: https://cecd-lab-ufpr.github.io/

O site é HTML, CSS e JavaScript puros, sem etapa de build. Toda alteração enviada ao ramo `main` é publicada pelo GitHub Pages em alguns minutos.

## Simuladores

Cada simulador acompanha um conceito da série de Reels "Estatística em 30s" e fica em `simuladores/<nome>/`, com um `index.html` (textos e controles) e um `sim.js` (a simulação). A página geral é `simuladores/index.html`.

- `simuladores/base/estat.js`: funções estatísticas.
- `simuladores/base/lab.js`: gráficos em canvas, controles e arraste.
- `simuladores/base/lab.css`: visual, com as cores e as fontes do pacote de identidade.

Para incluir um simulador, copie a pasta de um existente, troque o `index.html` e o `sim.js`, e adicione o link em `simuladores/index.html` e na seção Simuladores do `index.html` principal.

Identidade visual: Luana Lagner.

Contato: cecd.proplad@ufpr.br
