/* Desvio padrão: duas turmas com as notas do Reels, em que cada nota pode ser arrastada. */
(function () {
  'use strict';
  var E = Estat, L = Lab, C = L.COR;
  var NOTAS_A = [6.5, 7, 7.5, 6.5, 7, 7.5, 7, 7], NOTAS_B = [3, 4, 5, 7, 8, 9, 10, 10];
  var MIN_ALUNOS = 2, MAX_ALUNOS = 14;

  var turmas = [
    { nome: 'Turma A', cor: C.ciano, notas: NOTAS_A.slice() },
    { nome: 'Turma B', cor: C.ambar, notas: NOTAS_B.slice() }
  ];
  var selecao = { t: 0, i: 0 }, comFoco = false, posicoes = [[], []];
  var canvas = L.achar('grafico');
  var tela = L.tela(canvas, desenhar);

  function medidas(Lg, Al) {
    var margem = Lg < 520 ? 14 : 22;
    return { x: L.escala(0, 10, margem, Lg - margem), raio: Lg < 520 ? 7 : 9, faixa: Al / 2 };
  }

  // Empilha notas próximas para que nenhuma fique escondida atrás de outra
  function empilhar(t, g, base) {
    var ordem = turmas[t].notas.map(function (v, i) { return i; }).sort(function (a, b) { return turmas[t].notas[a] - turmas[t].notas[b] || a - b; });
    var niveis = [], pos = [];
    ordem.forEach(function (i) {
      var px = g.x(turmas[t].notas[i]), nivel = 0;
      while (niveis[nivel] !== undefined && px - niveis[nivel] < g.raio * 2 + 1) nivel++;
      niveis[nivel] = px;
      pos[i] = { x: px, y: base - g.raio - 4 - nivel * (g.raio * 2 + 2) };
    });
    return pos;
  }

  function desenhar(ctx, Lg, Al) {
    var g = medidas(Lg, Al);
    turmas.forEach(function (turma, t) {
      var topo = t * g.faixa, base = topo + g.faixa - 28;
      var m = E.media(turma.notas), s = E.dp(turma.notas), inicio = topo + 30;
      // Faixa de um desvio padrão para cada lado da média
      var x0 = g.x(L.limitar(m - s, 0, 10)), x1 = g.x(L.limitar(m + s, 0, 10));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x0, inicio, x1 - x0, base - inicio);
      L.linhaRef(ctx, g.x(m), inicio, g.x(m), base);
      // Título da turma, com a cor só na marca
      ctx.beginPath(); ctx.arc(g.x(0) + 5, topo + 12, 5, 0, 6.3); ctx.fillStyle = turma.cor; ctx.fill();
      L.texto(ctx, turma.nome.toUpperCase(), g.x(0) + 16, topo + 16, { tamanho: 13, peso: 500, cor: C.branco });
      L.texto(ctx, 'média ' + L.num(m, 1) + ' · s = ' + L.num(s, 2), g.x(10), topo + 16, { tamanho: 13, alinhar: 'right', cor: C.branco });
      // Distância de cada nota até a média
      var pos = empilhar(t, g, base);
      posicoes[t] = pos;
      ctx.strokeStyle = turma.cor; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
      pos.forEach(function (p) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(g.x(m), p.y); ctx.stroke(); });
      ctx.globalAlpha = 1;
      pos.forEach(function (p, i) {
        var marcado = comFoco && selecao.t === t && selecao.i === i;
        L.ponto(ctx, p.x, p.y, g.raio, turma.cor, marcado ? C.branco : C.fundo);
      });
      L.eixoX(ctx, g.x, base, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  }

  function razao(a, b) { return a / b; }

  function atualizar() {
    var a = turmas[0], b = turmas[1];
    var ma = E.media(a.notas), mb = E.media(b.notas), sa = E.dp(a.notas), sb = E.dp(b.notas);
    L.escrever('media-a', L.num(ma, 2)); L.escrever('media-b', L.num(mb, 2));
    L.escrever('dp-a', L.num(sa, 2)); L.escrever('dp-b', L.num(sb, 2));
    var igualMedia = Math.abs(ma - mb) < 0.05, frase;
    var inicio = igualMedia ? 'Mesma média' : 'Médias diferentes (' + L.num(ma, 1) + ' e ' + L.num(mb, 1) + ')';
    if (sa < 0.005 && sb < 0.005) frase = inicio + ', e nenhuma variação: s = 0 nas duas turmas.';
    else if (sa < 0.005 || sb < 0.005) frase = inicio + '. Na ' + (sa < 0.005 ? a.nome : b.nome) + ', todas as notas são iguais, por isso s = 0.';
    else {
      var maior = sa >= sb ? a : b, r = razao(Math.max(sa, sb), Math.min(sa, sb));
      frase = r < 1.05 ? inicio + ', com espalhamento parecido.' : inicio + (igualMedia ? ', mas a ' : ', e a ') + maior.nome + ' é ' + L.num(r, 1) + ' vezes mais espalhada.';
    }
    L.escrever('veredito', frase);
    L.achar('tabelas').innerHTML = turmas.map(tabela).join('');
    tela.pedir();
  }

  function tabela(turma) {
    var m = E.media(turma.notas), soma = 0;
    var linhas = turma.notas.slice().sort(function (x, y) { return x - y; }).map(function (v) {
      var d = v - m; soma += d * d;
      return '<tr><td>' + L.num(v, 1) + '</td><td>' + L.num(d, 2) + '</td><td>' + L.num(d * d, 2) + '</td></tr>';
    }).join('');
    var n = turma.notas.length;
    return '<table><caption>' + turma.nome + ', média ' + L.num(m, 2) + '</caption><thead><tr><th>Nota</th><th>Nota − média</th><th>Ao quadrado</th></tr></thead><tbody>' + linhas +
      '</tbody><tfoot><tr><td colspan="2">Soma ÷ (n − 1)</td><td>' + L.num(soma, 2) + ' ÷ ' + (n - 1) + ' = ' + L.num(soma / (n - 1), 2) + '</td></tr>' +
      '<tr><td colspan="2">Raiz quadrada: s</td><td>' + L.num(Math.sqrt(soma / (n - 1)), 2) + '</td></tr></tfoot></table>';
  }

  function definir(a, b) {
    turmas[0].notas = a.slice(); turmas[1].notas = b.slice();
    selecao = { t: 0, i: 0 };
    contarAlunos(); atualizar();
  }

  function sortear() {
    turmas.forEach(function (t) {
      var centro = 4 + Math.random() * 4, espalho = 0.3 + Math.random() * 2.7;
      t.notas = t.notas.map(function () { return Math.round(L.limitar(centro + espalho * E.normal(), 0, 10) * 10) / 10; });
    });
    selecao = { t: 0, i: 0 };
    atualizar();
  }

  function contarAlunos() {
    L.escrever('n-a', String(turmas[0].notas.length));
    L.escrever('n-b', String(turmas[1].notas.length));
  }

  L.arrastar(canvas, {
    achar: function (x, y) {
      var melhor = null, menor = 26;
      posicoes.forEach(function (pos, t) {
        pos.forEach(function (p, i) {
          var d = Math.hypot(p.x - x, p.y - y);
          if (d < menor) { menor = d; melhor = { t: t, i: i }; }
        });
      });
      return melhor;
    },
    pegar: function (item) { selecao = item; },
    mover: function (item, x) {
      var g = medidas(tela.L, tela.A);
      turmas[item.t].notas[item.i] = Math.round(L.limitar(g.x.inv(x), 0, 10) * 10) / 10;
      atualizar();
    }
  });

  // Teclado: setas para os lados mudam a nota; para cima e para baixo trocam de aluno
  canvas.addEventListener('focus', function () { comFoco = true; tela.pedir(); });
  canvas.addEventListener('blur', function () { comFoco = false; tela.pedir(); });
  canvas.addEventListener('keydown', function (e) {
    var notas = turmas[selecao.t].notas, passo = e.shiftKey ? 0.5 : 0.1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var sinal = e.key === 'ArrowRight' ? 1 : -1;
      notas[selecao.i] = Math.round(L.limitar(notas[selecao.i] + sinal * passo, 0, 10) * 10) / 10;
      atualizar(); e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      var total = turmas[0].notas.length + turmas[1].notas.length;
      var indice = selecao.t * turmas[0].notas.length + selecao.i;
      indice = (indice + (e.key === 'ArrowDown' ? 1 : total - 1)) % total;
      selecao = indice < turmas[0].notas.length ? { t: 0, i: indice } : { t: 1, i: indice - turmas[0].notas.length };
      tela.pedir(); e.preventDefault();
    }
  });

  document.querySelectorAll('[data-aluno]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = turmas[Number(b.dataset.turma)], mais = b.dataset.aluno === 'mais';
      if (mais && t.notas.length < MAX_ALUNOS) t.notas.push(Math.round(E.media(t.notas) * 10) / 10);
      if (!mais && t.notas.length > MIN_ALUNOS) t.notas.pop();
      selecao = { t: 0, i: 0 };
      contarAlunos(); atualizar();
    });
  });
  L.achar('voltar').addEventListener('click', function () { definir(NOTAS_A, NOTAS_B); });
  L.achar('sortear').addEventListener('click', sortear);

  L.desafios({
    reels: function () { definir(NOTAS_A, NOTAS_B); },
    zero: function () { definir(NOTAS_A, [7, 7, 7, 7, 7, 7, 7, 7]); },
    zerou: function () { definir([6.5, 7, 7.5, 6.5, 7, 7.5, 7, 0], NOTAS_B); },
    maximo: function () { definir(NOTAS_A, [0, 0, 0, 0, 10, 10, 10, 10]); }
  });

  contarAlunos();
  atualizar();
})();
