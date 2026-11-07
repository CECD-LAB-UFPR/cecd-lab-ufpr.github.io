/* Intervalo de confiança: cada amostra gera um intervalo; os que erram a média verdadeira ficam em âmbar.
   O modo "vida real" esconde a média verdadeira e deixa só um intervalo, como em uma pesquisa de verdade. */
(function () {
  'use strict';
  var E = Estat, L = Lab, C = L.COR;
  var MU = 50, SIGMA = 10, X0 = 20, X1 = 80, ALVO = 1000;
  var TAMANHOS = [3, 5, 10, 20, 30, 50, 100, 200];

  var n = 20, nivel = 0.95, metodo = 't', populacao = 'normal', vidaReal = false;
  var quantil = 0, lista = [], total = 0, acertos = 0, somaLargura = 0, acumulado = 0, intervalo = 110;
  var linhas = [];

  var telaIc = L.tela(L.achar('grafico'), desenhar);
  var botao = L.achar('jogar');

  var animacao = L.laco(function (dt) {
    acumulado += dt;
    while (acumulado >= intervalo && total < ALVO) {
      gerar(); acumulado -= intervalo;
      intervalo = Math.max(14, intervalo * 0.975);
    }
    pintar();
    if (total >= ALVO) return false;
  }, function (ligado) { botao.textContent = ligado ? 'Pausar' : (total >= ALVO ? 'Recomeçar' : 'Sortear amostras'); });

  function calcularQuantil() {
    var p = 1 - (1 - nivel) / 2;
    quantil = metodo === 't' ? E.quantilT(p, n - 1) : E.quantilNormal(p);
  }

  function observacao() {
    if (populacao === 'normal') return MU + SIGMA * E.normal();
    var u = 0; while (u === 0) u = Math.random();
    return MU - SIGMA - SIGMA * Math.log(u); // exponencial deslocada, com a mesma média e o mesmo desvio
  }

  function gerar() {
    var soma = 0, quad = 0;
    for (var i = 0; i < n; i++) { var x = observacao(); soma += x; quad += x * x; }
    var m = soma / n, s = Math.sqrt(Math.max(0, (quad - n * m * m) / (n - 1))), meia = quantil * s / Math.sqrt(n);
    var acertou = m - meia <= MU && MU <= m + meia;
    lista.unshift({ m: m, de: m - meia, ate: m + meia, acertou: acertou });
    if (lista.length > 120) lista.pop();
    total++; if (acertou) acertos++;
    somaLargura += 2 * meia;
  }

  function reiniciar(rodar) {
    animacao.desligar();
    calcularQuantil();
    lista = []; total = 0; acertos = 0; somaLargura = 0; acumulado = 0; intervalo = 110;
    if (rodar && L.parado) while (total < 100) gerar();
    pintar();
    if (rodar && !L.parado && !vidaReal) animacao.ligar();
    else botao.textContent = 'Sortear amostras';
  }

  function area(Lg, Al) {
    var esq = 14, dir = Lg - 14, topo = 26, base = Al - 28;
    return { x: L.escala(X0, X1, esq, dir), esq: esq, dir: dir, topo: topo, base: base };
  }

  function desenhar(ctx, Lg, Al) {
    var a = area(Lg, Al), marcas = [20, 30, 40, 50, 60, 70, 80];
    linhas = [];
    if (vidaReal) { desenharUm(ctx, a, Lg); L.eixoX(ctx, a.x, a.base, marcas); return; }
    var fila = Lg < 520 ? 50 : 70, alto = (a.base - a.topo) / fila;
    ctx.strokeStyle = C.branco; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.x(MU), a.topo - 6); ctx.lineTo(a.x(MU), a.base); ctx.stroke();
    L.texto(ctx, 'μ = ' + MU + ' (média verdadeira)', a.x(MU), 12, { tamanho: 13, alinhar: 'center', cor: C.branco });
    ctx.lineCap = 'butt';
    for (var i = 0; i < Math.min(fila, lista.length); i++) {
      var iv = lista[i], y = a.topo + (i + 0.5) * alto;
      var x0 = Math.max(a.x(iv.de), a.esq), x1 = Math.min(a.x(iv.ate), a.dir);
      ctx.strokeStyle = iv.acertou ? C.ciano : C.ambar;
      ctx.lineWidth = iv.acertou ? Math.min(2, alto * 0.5) : Math.min(3.5, alto * 0.8);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      linhas.push({ y: y, iv: iv });
    }
    L.eixoX(ctx, a.x, a.base, marcas);
  }

  function desenharUm(ctx, a, Lg) {
    var meio = (a.base + a.topo) / 2, iv = lista[0];
    if (!iv) {
      L.texto(ctx, 'Sorteie uma amostra', Lg / 2, meio, { tamanho: 14, alinhar: 'center', cor: C.branco });
      return;
    }
    var x0 = Math.max(a.x(iv.de), a.esq), x1 = Math.min(a.x(iv.ate), a.dir);
    ctx.strokeStyle = C.ciano; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, meio); ctx.lineTo(x1, meio);
    ctx.moveTo(x0, meio - 12); ctx.lineTo(x0, meio + 12);
    ctx.moveTo(x1, meio - 12); ctx.lineTo(x1, meio + 12);
    ctx.stroke();
    L.ponto(ctx, a.x(iv.m), meio, 6, C.branco);
    L.texto(ctx, L.num(iv.de, 1) + ' a ' + L.num(iv.ate, 1), Lg / 2, meio - 34, { tamanho: 18, peso: 500, alinhar: 'center', cor: C.branco });
    L.texto(ctx, 'A média verdadeira está aqui dentro?', Lg / 2, meio + 44, { tamanho: 14, alinhar: 'center', cor: C.branco });
  }

  function pintar() {
    var pct = L.num(nivel * 100) + '%';
    L.escrever('total', L.num(total));
    L.escrever('acertos', total ? L.num(acertos) : '–');
    L.escrever('erros', total ? L.num(total - acertos) + ' erraram' : ' ');
    L.escrever('cobertura', total ? L.num(acertos / total * 100, 1) + '%' : '–');
    L.escrever('nominal', 'prometido: ' + pct);
    L.escrever('largura', total ? L.num(somaLargura / total, 1) : '–');
    L.escrever('quantil', (metodo === 't' ? 't' : 'z') + ' = ' + L.num(quantil, 2));
    var frase;
    if (vidaReal) frase = 'Na vida real é assim: um intervalo só. O ' + pct + ' fala do método, e você não tem como saber se este é um dos que erraram.';
    else if (total < 20) frase = 'Cada linha é uma amostra diferente. Em âmbar, as que deixaram μ de fora.';
    else {
      var d = acertos / total - nivel;
      if (total >= 300 && d < -0.015) frase = 'O método promete ' + pct + ', mas entrega menos. Algo nas condições está errado.';
      else frase = 'De ' + L.num(total) + ' intervalos, ' + L.num(total - acertos) + ' erraram. Nenhum deles sabia disso.';
    }
    L.escrever('veredito', frase);
    L.escrever('revelar', vidaReal ? 'Revelar a verdade' : 'Esconder a verdade');
    L.achar('nova').hidden = !vidaReal;
    botao.hidden = vidaReal; L.achar('cem').hidden = vidaReal;
    L.achar('legenda').hidden = vidaReal;
    telaIc.pedir();
  }

  function definirN(valor) {
    n = valor;
    L.achar('n').value = String(TAMANHOS.indexOf(valor));
    L.escrever('n-saida', 'n = ' + valor);
  }
  function aplicar(o) {
    vidaReal = false;
    if (o.n) definirN(o.n);
    if (o.nivel) { nivel = o.nivel; escolhaNivel.marcar(o.nivel); }
    metodo = o.metodo || 't'; escolhaMetodo.marcar(metodo);
    populacao = o.populacao || 'normal'; escolhaPop.marcar(populacao);
    reiniciar(true);
  }

  var escolhaNivel = L.escolha(L.achar('nivel'), function (v) { nivel = Number(v); reiniciar(true); });
  var escolhaMetodo = L.escolha(L.achar('metodo'), function (v) { metodo = v; reiniciar(true); });
  var escolhaPop = L.escolha(L.achar('populacao'), function (v) { populacao = v; reiniciar(true); });

  L.achar('n').addEventListener('input', function (e) { definirN(TAMANHOS[Number(e.target.value)]); reiniciar(true); });
  botao.addEventListener('click', function () {
    if (animacao.ligado()) { animacao.desligar(); return; }
    if (total >= ALVO) { reiniciar(true); return; }
    if (L.parado) { for (var i = 0; i < 100 && total < ALVO; i++) gerar(); pintar(); return; }
    animacao.ligar();
  });
  L.achar('cem').addEventListener('click', function () { animacao.desligar(); for (var i = 0; i < 100; i++) gerar(); pintar(); });
  L.achar('nova').addEventListener('click', function () { gerar(); pintar(); });
  L.achar('limpar').addEventListener('click', function () { reiniciar(false); });
  function alternarVidaReal() {
    vidaReal = !vidaReal;
    animacao.desligar();
    if (vidaReal && !lista.length) gerar();
    botao.textContent = 'Sortear amostras';
    pintar();
  }
  L.achar('revelar').addEventListener('click', alternarVidaReal);

  L.dica(L.achar('grafico'), function (x, y) {
    if (vidaReal || !linhas.length) return null;
    var melhor = null, menor = 10;
    linhas.forEach(function (l) { var d = Math.abs(l.y - y); if (d < menor) { menor = d; melhor = l; } });
    if (!melhor) return null;
    return L.num(melhor.iv.de, 1) + ' a ' + L.num(melhor.iv.ate, 1) + (melhor.iv.acertou ? ' · contém μ' : ' · errou μ');
  });

  L.desafios({
    conte: function () { aplicar({ n: 20, nivel: 0.95 }); },
    exija: function () { aplicar({ n: 20, nivel: 0.99 }); },
    amostra: function () { aplicar({ n: 200, nivel: 0.95 }); },
    z: function () { aplicar({ n: 5, nivel: 0.95, metodo: 'z' }); },
    torta: function () { aplicar({ n: 5, nivel: 0.95, populacao: 'assimetrica' }); },
    verdade: function () { aplicar({ n: 20, nivel: 0.95 }); alternarVidaReal(); }
  });

  definirN(20);
  escolhaNivel.marcar(0.95); escolhaMetodo.marcar('t'); escolhaPop.marcar('normal');
  reiniciar(true);
})();
