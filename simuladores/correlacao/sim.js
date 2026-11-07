/* Correlação: nuvem de pontos editável e um jogo de adivinhar o r de cinco gráficos. */
(function () {
  'use strict';
  var E = Estat, L = Lab, C = L.COR;
  var RODADAS = 5, MIN_PONTOS = 3, MAX_PONTOS = 80;

  var pontos = [], modo = 'explorar', arrastado = null, comFoco = false, selecionado = 0;
  var jogo = { rodada: 1, erros: [], revelado: false };

  var canvas = L.achar('grafico');
  var tela = L.tela(canvas, desenhar);

  function dentro(v) { return L.limitar(v, 3, 97); }

  function nuvem(r, n, cx, cy, s) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = E.normal(), b = E.normal();
      out.push({ x: dentro(cx + s * a), y: dentro(cy + s * (r * a + Math.sqrt(1 - r * r) * b)) });
    }
    return out;
  }

  var CENARIOS = {
    forte: function () { return nuvem(0.9, 30, 50, 50, 19); },
    negativa: function () { return nuvem(-0.9, 30, 50, 50, 19); },
    nenhuma: function () { return nuvem(0, 30, 50, 50, 19); },
    curva: function () {
      var out = [];
      for (var i = 0; i < 30; i++) {
        var x = 8 + 84 * (i + 0.5) / 30;
        out.push({ x: x, y: dentro(12 + 0.03 * (x - 50) * (x - 50) + 3 * E.normal()) });
      }
      return out;
    },
    extremo: function () { return nuvem(0, 20, 30, 30, 7).concat([{ x: 92, y: 92 }]); },
    grupos: function () {
      var g1 = nuvem(-0.8, 15, 32, 36, 9).map(function (p) { p.g = 0; return p; });
      var g2 = nuvem(-0.8, 15, 68, 70, 9).map(function (p) { p.g = 1; return p; });
      return g1.concat(g2);
    }
  };

  function valores(lista, chave) { return lista.map(function (p) { return p[chave]; }); }
  function calcular(lista) {
    if (lista.length < 2) return { r: NaN, a: NaN, b: NaN };
    var x = valores(lista, 'x'), y = valores(lista, 'y'), reta = E.regressao(x, y);
    return { r: E.correlacao(x, y), a: reta.a, b: reta.b };
  }

  function area(Lg, Al) {
    var esq = 24, dir = Lg - 10, topo = 10, base = Al - 26;
    return { x: L.escala(0, 100, esq, dir), y: L.escala(0, 100, base, topo), esq: esq, dir: dir, topo: topo, base: base };
  }

  function reta(ctx, a, c, cor, largura) {
    if (!isFinite(c.b)) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(a.esq, a.topo, a.dir - a.esq, a.base - a.topo); ctx.clip();
    ctx.strokeStyle = cor; ctx.lineWidth = largura;
    ctx.beginPath(); ctx.moveTo(a.x(0), a.y(c.a)); ctx.lineTo(a.x(100), a.y(c.a + c.b * 100)); ctx.stroke();
    ctx.restore();
  }

  function desenhar(ctx, Lg, Al) {
    var a = area(Lg, Al), raio = Lg < 520 ? 6 : 7, marcas = [0, 25, 50, 75, 100];
    ctx.strokeStyle = C.grade; ctx.lineWidth = 1;
    marcas.forEach(function (v) {
      ctx.beginPath(); ctx.moveTo(a.esq, Math.round(a.y(v)) + 0.5); ctx.lineTo(a.dir, Math.round(a.y(v)) + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.round(a.x(v)) + 0.5, a.topo); ctx.lineTo(Math.round(a.x(v)) + 0.5, a.base); ctx.stroke();
    });
    L.texto(ctx, 'Variável X', (a.esq + a.dir) / 2, Al - 6, { alinhar: 'center' });
    ctx.save();
    ctx.translate(12, (a.topo + a.base) / 2); ctx.rotate(-Math.PI / 2);
    L.texto(ctx, 'Variável Y', 0, 0, { alinhar: 'center', base: 'middle' });
    ctx.restore();
    var mostrarReta = modo === 'explorar' || jogo.revelado;
    if (mostrarReta) {
      [0, 1].forEach(function (g) {
        var grupo = pontos.filter(function (p) { return p.g === g; });
        if (grupo.length > 2) reta(ctx, a, calcular(grupo), g ? C.ambar : C.ciano, 1.5);
      });
      reta(ctx, a, calcular(pontos), C.branco, 2);
    }
    pontos.forEach(function (p, i) {
      var marcado = p === arrastado || (comFoco && i === selecionado);
      L.ponto(ctx, a.x(p.x), a.y(p.y), raio, p.g === 1 ? C.ambar : C.ciano, marcado ? C.branco : C.fundo);
    });
  }

  function descrever(r) {
    if (!isFinite(r)) return 'Coloque pelo menos dois pontos que não estejam alinhados na vertical.';
    var f = Math.abs(r), sinal = r > 0 ? 'positiva' : 'negativa';
    if (f < 0.2) return 'Quase nenhuma relação linear. Olhe a nuvem: isso não quer dizer nenhuma relação.';
    if (f < 0.5) return 'Relação linear fraca e ' + sinal + '.';
    if (f < 0.8) return 'Relação linear moderada e ' + sinal + '.';
    return 'Relação linear forte e ' + sinal + '. Isso ainda não diz o que causa o quê.';
  }

  function pintar() {
    var c = calcular(pontos), escondido = modo === 'adivinhar' && !jogo.revelado;
    L.escrever('r', escondido ? '?' : L.num(c.r, 2));
    L.escrever('r2', escondido ? '?' : (isFinite(c.r) ? L.num(c.r * c.r * 100, 0) + '%' : '–'));
    L.escrever('n', String(pontos.length));
    L.escrever('inclinacao', escondido ? '?' : L.num(c.b, 2));
    if (modo === 'explorar') L.escrever('veredito', descrever(c.r));
    tela.pedir();
  }

  function usar(nome) { pontos = CENARIOS[nome](); selecionado = 0; pintar(); }

  function trocarModo(novo) {
    modo = novo;
    escolhaModo.marcar(novo);
    L.achar('controles-explorar').hidden = novo !== 'explorar';
    L.achar('controles-adivinhar').hidden = novo !== 'adivinhar';
    if (novo === 'adivinhar') novoJogo();
    else {
      L.escrever('rodada', 'Toque para pôr ou tirar pontos. Arraste para mover.');
      escolhaCenario.marcar('forte');
      usar('forte');
    }
  }

  function novoJogo() { jogo = { rodada: 1, erros: [], revelado: false }; novaRodada(); }
  function novaRodada() {
    jogo.revelado = false;
    var r = Math.random() * 1.9 - 0.95;
    pontos = nuvem(r, 40, 50, 50, 18);
    L.achar('palpite').value = '0';
    L.achar('palpite').disabled = false;
    L.escrever('palpite-saida', L.num(0, 2));
    L.escrever('confirmar', 'Confirmar palpite');
    L.escrever('rodada', 'Gráfico ' + jogo.rodada + ' de ' + RODADAS);
    L.escrever('veredito', 'Olhe a nuvem e arraste o controle até o r que você acha que ela tem.');
    pintar();
  }
  function confirmar() {
    if (jogo.revelado) {
      if (jogo.rodada >= RODADAS) novoJogo();
      else { jogo.rodada++; novaRodada(); }
      return;
    }
    var real = calcular(pontos).r, palpite = Number(L.achar('palpite').value), erro = Math.abs(real - palpite);
    jogo.erros.push(erro);
    jogo.revelado = true;
    L.achar('palpite').disabled = true;
    var frase = 'O r era ' + L.num(real, 2) + '. Você errou por ' + L.num(erro, 2) + '.';
    if (jogo.rodada >= RODADAS) {
      var medio = E.media(jogo.erros);
      frase += ' Erro médio nos ' + RODADAS + ' gráficos: ' + L.num(medio, 2) + '. ' +
        (medio < 0.08 ? 'Olho clínico.' : medio < 0.15 ? 'Muito bom.' : medio < 0.25 ? 'Nada mal.' : 'A correlação engana mesmo. Tente de novo.');
      L.escrever('confirmar', 'Jogar de novo');
    } else L.escrever('confirmar', 'Próximo gráfico');
    L.escrever('veredito', frase);
    pintar();
  }

  L.arrastar(canvas, {
    achar: function (px, py) {
      if (modo !== 'explorar') return null;
      var a = area(tela.L, tela.A), melhor = null, menor = 24;
      pontos.forEach(function (p) {
        var d = Math.hypot(a.x(p.x) - px, a.y(p.y) - py);
        if (d < menor) { menor = d; melhor = p; }
      });
      return melhor;
    },
    pegar: function (p) { arrastado = p; tela.pedir(); },
    mover: function (p, px, py) {
      var a = area(tela.L, tela.A);
      p.x = L.limitar(a.x.inv(px), 0, 100); p.y = L.limitar(a.y.inv(py), 0, 100);
      pintar();
    },
    soltar: function (p, moveu) {
      arrastado = null;
      if (!moveu && pontos.length > MIN_PONTOS) pontos.splice(pontos.indexOf(p), 1);
      selecionado = 0;
      pintar();
    },
    tocarVazio: function (px, py) {
      if (modo !== 'explorar' || pontos.length >= MAX_PONTOS) return;
      var a = area(tela.L, tela.A);
      if (px < a.esq || px > a.dir || py < a.topo || py > a.base) return;
      pontos.push({ x: a.x.inv(px), y: a.y.inv(py) });
      pintar();
    }
  });

  // Teclado: Tab troca de ponto com N e P; as setas movem o ponto selecionado
  canvas.addEventListener('focus', function () { comFoco = true; tela.pedir(); });
  canvas.addEventListener('blur', function () { comFoco = false; tela.pedir(); });
  canvas.addEventListener('keydown', function (e) {
    if (modo !== 'explorar' || !pontos.length) return;
    var p = pontos[selecionado], d = e.shiftKey ? 5 : 1, usado = true;
    if (e.key === 'ArrowLeft') p.x = L.limitar(p.x - d, 0, 100);
    else if (e.key === 'ArrowRight') p.x = L.limitar(p.x + d, 0, 100);
    else if (e.key === 'ArrowUp') p.y = L.limitar(p.y + d, 0, 100);
    else if (e.key === 'ArrowDown') p.y = L.limitar(p.y - d, 0, 100);
    else if (e.key === 'n') selecionado = (selecionado + 1) % pontos.length;
    else if (e.key === 'p') selecionado = (selecionado + pontos.length - 1) % pontos.length;
    else usado = false;
    if (usado) { e.preventDefault(); pintar(); }
  });

  var escolhaModo = L.escolha(L.achar('modo'), trocarModo);
  var escolhaCenario = L.escolha(L.achar('cenario'), usar);
  L.achar('palpite').addEventListener('input', function (e) { L.escrever('palpite-saida', L.num(Number(e.target.value), 2)); });
  L.achar('confirmar').addEventListener('click', confirmar);
  L.achar('sortear').addEventListener('click', function () {
    var atual = document.querySelector('#cenario [aria-pressed="true"]');
    usar(atual ? atual.dataset.valor : 'forte');
  });

  function cenario(nome) { if (modo !== 'explorar') trocarModo('explorar'); escolhaCenario.marcar(nome); usar(nome); }
  L.desafios({
    extremo: function () { cenario('extremo'); },
    curva: function () { cenario('curva'); },
    grupos: function () { cenario('grupos'); },
    jogo: function () { trocarModo('adivinhar'); }
  });

  escolhaModo.marcar('explorar');
  escolhaCenario.marcar('forte');
  usar('forte');
})();
