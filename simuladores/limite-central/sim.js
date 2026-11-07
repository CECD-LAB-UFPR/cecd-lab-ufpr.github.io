/* Teorema Central do Limite: uma população qualquer, em uma grade de 200 pontos entre 0 e 10,
   e a distribuição das médias de amostras de tamanho n. A população pode ser desenhada à mão. */
(function () {
  'use strict';
  var E = Estat, L = Lab, C = L.COR;
  var K = 200, DX = 10 / K, MAX_MEDIAS = 20000, ALVO = 4000;
  var TAMANHOS = [1, 2, 5, 10, 20, 30, 50, 100];

  function gauss(x, m, s) { return Math.exp(-0.5 * Math.pow((x - m) / s, 2)); }
  var FORMAS = {
    uniforme: function () { return 1; },
    assimetrica: function (x) { return Math.exp(-x / 1.4); },
    picos: function (x) { return gauss(x, 2.6, 0.75) + gauss(x, 7.6, 0.75); },
    extremos: function (x) { return Math.pow(Math.abs(x - 5) / 5, 3) + 0.01; },
    premio: function (x) { return gauss(x, 1, 0.45) * 0.95 / 0.45 + gauss(x, 9, 0.3) * 0.05 / 0.3; }
  };

  var forma = new Float64Array(K), pop = null, n = 5, medias = new Float64Array(MAX_MEDIAS), total = 0;
  var ultimaAmostra = [], ultimaMedia = null, ampliar = false, comCurva = true, desenhando = false;
  var intro = true, alturaY = null, barras = null, quadros = 0, riscou = false;

  var canvasPop = L.achar('grafico-pop');
  var telaPop = L.tela(canvasPop, desenharPop);
  var telaMedias = L.tela(L.achar('grafico'), desenharMedias);
  var botao = L.achar('jogar');

  var animacao = L.laco(function () {
    quadros++;
    var lote = intro && total < 18 ? (quadros % 12 === 0 ? 1 : 0) : Math.max(2, Math.min(70, Math.ceil(total / 30)));
    if (lote) amostrar(lote);
    pintar();
    if (total >= ALVO) { intro = false; return false; }
  }, function (ligado) { botao.textContent = ligado ? 'Pausar' : 'Sortear amostras'; });

  function construir() {
    var soma = 0, i, cdf = new Float64Array(K);
    for (i = 0; i < K; i++) soma += forma[i];
    if (soma < 1e-9) { for (i = 0; i < K; i++) forma[i] = 1; soma = K; }
    var ac = 0, mu = 0, m2 = 0, m3 = 0;
    for (i = 0; i < K; i++) { ac += forma[i] / soma; cdf[i] = ac; }
    cdf[K - 1] = 1;
    for (i = 0; i < K; i++) mu += forma[i] / soma * (i + 0.5) * DX;
    for (i = 0; i < K; i++) {
      var d = (i + 0.5) * DX - mu, w = forma[i] / soma;
      m2 += w * d * d; m3 += w * d * d * d;
    }
    m2 += DX * DX / 12; // variância dentro de cada faixa da grade
    pop = { cdf: cdf, mu: mu, sigma: Math.sqrt(m2), assimetria: m3 / Math.pow(m2, 1.5) };
  }

  function sorteio() {
    var u = Math.random(), a = 0, b = K - 1;
    while (a < b) { var m = (a + b) >> 1; if (pop.cdf[m] < u) a = m + 1; else b = m; }
    return (a + Math.random()) * DX;
  }

  function amostrar(q) {
    for (var r = 0; r < q && total < MAX_MEDIAS; r++) {
      var s = 0, guardar = r === q - 1, amostra = guardar ? [] : null;
      for (var i = 0; i < n; i++) { var v = sorteio(); s += v; if (guardar) amostra.push(v); }
      medias[total++] = s / n;
      if (guardar) { ultimaAmostra = amostra; ultimaMedia = s / n; }
    }
  }

  function reiniciar() {
    total = 0; ultimaAmostra = []; ultimaMedia = null; alturaY = null; quadros = 0;
    if (L.parado) { animacao.desligar(); amostrar(ALVO); pintar(); return; }
    pintar();
    animacao.ligar();
  }

  function usarModelo(nome) {
    var f = FORMAS[nome], maior = 0, i;
    for (i = 0; i < K; i++) { forma[i] = f((i + 0.5) * DX); maior = Math.max(maior, forma[i]); }
    for (i = 0; i < K; i++) forma[i] /= maior;
    construir();
  }

  function modoDesenho(ligado) {
    desenhando = ligado;
    riscou = false;
    canvasPop.classList.toggle('desenho', ligado);
    L.achar('aviso-desenho').hidden = !ligado;
    telaPop.pedir();
  }

  function area(Lg, Al, faixaX) {
    var esq = 12, dir = Lg - 12, topo = 12, base = Al - 28;
    return { x: L.escala(faixaX[0], faixaX[1], esq, dir), esq: esq, dir: dir, topo: topo, base: base };
  }

  function desenharPop(ctx, Lg, Al) {
    var a = area(Lg, Al, [0, 10]), maior = 0, i;
    for (i = 0; i < K; i++) maior = Math.max(maior, forma[i]);
    var y = L.escala(0, (maior || 1) * 1.08, a.base, a.topo);
    ctx.beginPath(); ctx.moveTo(a.x(0), a.base);
    for (i = 0; i < K; i++) ctx.lineTo(a.x((i + 0.5) * DX), y(forma[i]));
    ctx.lineTo(a.x(10), a.base); ctx.closePath();
    ctx.fillStyle = 'rgba(91, 194, 231, 0.24)'; ctx.fill();
    ctx.beginPath();
    for (i = 0; i < K; i++) { var px = a.x((i + 0.5) * DX), py = y(forma[i]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.strokeStyle = C.ciano; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    if (desenhando && !riscou) {
      L.texto(ctx, 'Arraste aqui para desenhar', Lg / 2, a.topo + 12, { tamanho: 13, alinhar: 'center', cor: C.branco });
    } else {
      L.linhaRef(ctx, a.x(pop.mu), a.topo, a.x(pop.mu), a.base);
      var aDireita = pop.mu < 7;
      L.texto(ctx, 'μ = ' + L.num(pop.mu, 2), a.x(pop.mu) + (aDireita ? 6 : -6), a.topo + 10, { tamanho: 13, alinhar: aDireita ? 'left' : 'right', cor: C.branco });
      // Amostra mais recente: cada traço é uma observação; o ponto âmbar é a média delas
      ctx.strokeStyle = C.branco; ctx.lineWidth = 1; ctx.globalAlpha = n > 30 ? 0.5 : 0.85;
      ultimaAmostra.forEach(function (v) { var p = a.x(v); ctx.beginPath(); ctx.moveTo(p, a.base - 12); ctx.lineTo(p, a.base); ctx.stroke(); });
      ctx.globalAlpha = 1;
      if (ultimaMedia !== null) L.ponto(ctx, a.x(ultimaMedia), a.base - 16, 6, C.ambar);
    }
    L.eixoX(ctx, a.x, a.base, [0, 2, 4, 6, 8, 10]);
  }

  function faixaMedias() {
    if (!ampliar) return [0, 10];
    var se = pop.sigma / Math.sqrt(n);
    return [pop.mu - 4.5 * se, pop.mu + 4.5 * se];
  }

  function desenharMedias(ctx, Lg, Al) {
    var faixa = faixaMedias(), a = area(Lg, Al, faixa), se = pop.sigma / Math.sqrt(n);
    var nb = Math.floor((a.dir - a.esq) / (ampliar ? 7 : 4)), largura = (faixa[1] - faixa[0]) / nb;
    var cont = new Float64Array(nb), i, maior = 0;
    for (i = 0; i < total; i++) {
      var b = Math.floor((medias[i] - faixa[0]) / largura);
      if (b >= 0 && b < nb) cont[b]++;
    }
    var picoCurva = E.densidadeNormal(pop.mu, pop.mu, se);
    for (i = 0; i < nb; i++) maior = Math.max(maior, cont[i]);
    var densidadeMax = total ? maior / (total * largura) : 0;
    var alvoY = Math.max(densidadeMax, comCurva ? picoCurva : 0, 1e-6) * 1.12;
    alturaY = alturaY === null ? alvoY : alturaY + (alvoY - alturaY) * 0.2;
    var y = L.escala(0, alturaY, a.base, a.topo);
    var passo = (a.dir - a.esq) / nb, marcada = ultimaMedia === null ? -1 : Math.floor((ultimaMedia - faixa[0]) / largura);
    barras = { faixa: faixa, largura: largura, cont: cont, esq: a.esq, passo: passo };
    for (i = 0; i < nb; i++) {
      if (!cont[i]) continue;
      var h = a.base - y(cont[i] / (total * largura));
      ctx.fillStyle = i === marcada ? C.ambar : C.ciano;
      ctx.fillRect(a.esq + i * passo, a.base - h, Math.max(1, passo - 1), h);
    }
    if (comCurva) {
      ctx.beginPath();
      for (i = 0; i <= 240; i++) {
        var v = faixa[0] + (faixa[1] - faixa[0]) * i / 240, py = y(E.densidadeNormal(v, pop.mu, se)), px = a.x(v);
        if (i) ctx.lineTo(px, Math.max(py, a.topo - 8)); else ctx.moveTo(px, Math.max(py, a.topo - 8));
      }
      ctx.strokeStyle = C.branco; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    }
    var valores = ampliar ? L.marcas(faixa[0], faixa[1], 5) : [0, 2, 4, 6, 8, 10];
    var x = function (val) { return a.x(val); };
    x.faixa = [a.esq, a.dir];
    L.eixoX(ctx, x, a.base, valores, function (val) { return L.num(val, ampliar ? (se < 0.2 ? 2 : 1) : 0); });
  }

  function pintar() {
    var se = pop.sigma / Math.sqrt(n);
    L.escrever('total', L.num(total));
    if (total > 1) {
      var parte = medias.subarray(0, total);
      L.escrever('media', L.num(E.media(parte), 2));
      L.escrever('dp', L.num(E.dp(parte), 3));
      L.escrever('assimetria', L.num(E.assimetria(parte), 2));
    } else { L.escrever('media', '–'); L.escrever('dp', '–'); L.escrever('assimetria', '–'); }
    L.escrever('media-teo', 'teoria: μ = ' + L.num(pop.mu, 2));
    L.escrever('dp-teo', 'teoria: σ/√n = ' + L.num(se, 3));
    L.escrever('assimetria-teo', 'teoria: ' + L.num(pop.assimetria / Math.sqrt(n), 2));
    telaPop.pedir(); telaMedias.pedir();
  }

  function definirN(valor) {
    n = valor;
    L.achar('n').value = String(TAMANHOS.indexOf(valor));
    L.escrever('n-saida', 'n = ' + valor);
  }
  function aplicar(nome, tamanho) {
    modoDesenho(false);
    escolhaPop.marcar(nome);
    usarModelo(nome);
    definirN(tamanho);
    intro = false;
    reiniciar();
  }

  var escolhaPop = L.escolha(L.achar('populacao'), function (valor) {
    intro = false;
    if (valor === 'desenhe') { animacao.desligar(); modoDesenho(true); return; }
    modoDesenho(false); usarModelo(valor); reiniciar();
  });
  var escolhaEscala = L.escolha(L.achar('escala'), function (valor) { ampliar = valor === 'ampliada'; alturaY = null; pintar(); });

  L.achar('n').addEventListener('input', function (e) {
    intro = false;
    definirN(TAMANHOS[Number(e.target.value)]);
    alturaY = null;
    reiniciar();
  });
  L.achar('curva').addEventListener('change', function (e) { comCurva = e.target.checked; alturaY = null; pintar(); });
  botao.addEventListener('click', function () {
    if (animacao.ligado()) { animacao.desligar(); return; }
    if (total >= ALVO) reiniciar(); else if (L.parado) { amostrar(ALVO - total); pintar(); } else animacao.ligar();
  });
  L.achar('uma').addEventListener('click', function () { animacao.desligar(); amostrar(1); pintar(); });
  L.achar('mil').addEventListener('click', function () { animacao.desligar(); amostrar(1000); pintar(); });
  L.achar('limpar').addEventListener('click', function () {
    animacao.desligar(); total = 0; ultimaAmostra = []; ultimaMedia = null; alturaY = null; pintar();
  });

  // Desenho à mão livre, ligando os pontos para não deixar buracos em traços rápidos
  var ultimo = null;
  function pintarForma(px, py) {
    var a = area(telaPop.L, telaPop.A, [0, 10]);
    var k = Math.floor(L.limitar(a.x.inv(px), 0, 9.999) / DX);
    var h = L.limitar((a.base - py) / (a.base - a.topo), 0, 1);
    if (ultimo) {
      var de = Math.min(ultimo.k, k), ate = Math.max(ultimo.k, k);
      for (var i = de; i <= ate; i++) {
        var f = ate === de ? 1 : (i - ultimo.k) / (k - ultimo.k);
        forma[i] = ultimo.h + (h - ultimo.h) * f;
      }
    } else forma[k] = h;
    ultimo = { k: k, h: h };
    riscou = true;
    telaPop.pedir();
  }
  canvasPop.addEventListener('pointerdown', function (e) {
    if (!desenhando) return;
    ultimo = null;
    try { canvasPop.setPointerCapture(e.pointerId); } catch (erro) { /* ponteiro já encerrado */ }
    var r = canvasPop.getBoundingClientRect();
    pintarForma(e.clientX - r.left, e.clientY - r.top);
    e.preventDefault();
  });
  canvasPop.addEventListener('pointermove', function (e) {
    if (!desenhando || !ultimo) return;
    var r = canvasPop.getBoundingClientRect();
    pintarForma(e.clientX - r.left, e.clientY - r.top);
  });
  function terminarTraco() {
    if (!desenhando || !ultimo) return;
    ultimo = null;
    construir();
    reiniciar();
  }
  canvasPop.addEventListener('pointerup', terminarTraco);
  canvasPop.addEventListener('pointercancel', terminarTraco);

  L.dica(L.achar('grafico'), function (x) {
    if (!barras) return null;
    var i = Math.floor((x - barras.esq) / barras.passo);
    if (i < 0 || i >= barras.cont.length || !barras.cont[i]) return null;
    var de = barras.faixa[0] + i * barras.largura;
    return L.num(barras.cont[i]) + ' médias entre ' + L.num(de, 2) + ' e ' + L.num(de + barras.largura, 2);
  });

  L.desafios({
    torta: function () { aplicar('assimetrica', 1); },
    trinta: function () { aplicar('assimetrica', 30); },
    picos: function () { aplicar('picos', 2); },
    raiz: function () { aplicar('uniforme', 20); },
    premio: function () { aplicar('premio', 30); },
    desenho: function () { escolhaPop.marcar('desenhe'); animacao.desligar(); intro = false; modoDesenho(true); }
  });

  escolhaEscala.marcar('original');
  escolhaPop.marcar('assimetrica');
  usarModelo('assimetrica');
  definirN(5);
  reiniciar();
})();
