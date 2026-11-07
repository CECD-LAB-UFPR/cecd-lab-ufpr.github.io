/* Lei dos grandes números: médias acumuladas de várias pessoas repetindo o mesmo experimento.
   Até n = 100 cada lançamento vira um ponto; depois os pontos ficam espaçados em 2%,
   para que o gráfico em escala logarítmica continue leve até 100 mil lançamentos. */
(function () {
  'use strict';
  var E = Estat, L = Lab, C = L.COR;
  var N_MAX = 100000;

  var grade = [], v;
  for (v = 1; v <= 100; v++) grade.push(v);
  v = 100;
  while (v < N_MAX) { v = Math.min(N_MAX, Math.ceil(v * 1.02)); grade.push(v); }

  var TIPOS = {
    moeda: {
      nome: 'Proporção de caras', eixo: [0, 1], casas: 3, unidade: 'caras',
      esperado: function () { return p; }, desvio: function () { return Math.sqrt(p * (1 - p)); },
      sortear: function () { return Math.random() < p ? 1 : 0; }
    },
    dado: {
      nome: 'Média das faces', eixo: [1, 6], casas: 3, unidade: 'pontos',
      esperado: function () { return 3.5; }, desvio: function () { return Math.sqrt(35 / 12); },
      sortear: function () { return 1 + Math.floor(Math.random() * 6); }
    },
    cauchy: {
      nome: 'Média acumulada', eixo: [-10, 10], casas: 2, unidade: '',
      esperado: function () { return null; }, desvio: function () { return null; },
      sortear: function () { return Math.tan(Math.PI * (Math.random() - 0.5)); }
    }
  };

  var tipo = 'moeda', p = 0.5, pessoas = 5;
  var indice = 0, trilhas = [], diferencas = [], mira = null, acumulado = 0;

  var telaMedia = L.tela(L.achar('grafico'), desenharMedia);
  var telaDif = L.tela(L.achar('grafico-dif'), desenharDiferenca);
  var botao = L.achar('jogar');

  var animacao = L.laco(function (dt) {
    acumulado += dt;
    while (acumulado >= 16 && indice < grade.length) { passo(); acumulado -= 16; }
    pintar();
    if (indice >= grade.length) return false;
  }, function (ligado) {
    botao.textContent = ligado ? 'Pausar' : (indice >= grade.length ? 'Lançar de novo' : (indice ? 'Continuar' : 'Lançar'));
  });

  function passo() {
    var t = TIPOS[tipo], fim = grade[indice], comeco = indice ? grade[indice - 1] : 0;
    for (var k = 0; k < trilhas.length; k++) {
      var tr = trilhas[k];
      for (var i = comeco; i < fim; i++) tr.soma += t.sortear();
      tr.medias.push(tr.soma / fim);
    }
    var e = t.esperado();
    if (e !== null) diferencas.push(trilhas[0].soma - fim * e);
    indice++;
  }

  function reiniciar(rodar) {
    animacao.desligar();
    indice = 0; acumulado = 0; diferencas = []; mira = null;
    trilhas = [];
    for (var k = 0; k < pessoas; k++) trilhas.push({ soma: 0, medias: [] });
    if (rodar && L.parado) { while (indice < grade.length) passo(); }
    pintar();
    if (rodar && !L.parado) animacao.ligar();
    else botao.textContent = indice >= grade.length ? 'Lançar de novo' : 'Lançar';
  }

  function area(Lg, Al) {
    var esq = 42, dir = 12, topo = 10, base = Al - 30;
    return {
      x: L.escala(0, Math.log10(N_MAX), esq, Lg - dir), esq: esq, dir: Lg - dir, topo: topo, base: base
    };
  }
  function xn(a, n) { return a.x(Math.log10(n)); }
  var POTENCIAS = [1, 10, 100, 1000, 10000, 100000];
  function eixoN(ctx, a) {
    var x = function (n) { return xn(a, n); };
    x.faixa = [a.esq, a.dir];
    L.eixoX(ctx, x, a.base, POTENCIAS, function (n) { return n === 100000 ? '100 mil' : L.num(n); });
  }

  function desenharMedia(ctx, Lg, Al) {
    var t = TIPOS[tipo], a = area(Lg, Al), e = t.esperado(), sd = t.desvio();
    var y = L.escala(t.eixo[0], t.eixo[1], a.base, a.topo);
    L.eixoY(ctx, y, L.marcas(t.eixo[0], t.eixo[1], 5), a.esq, a.dir, function (val) {
      return tipo === 'moeda' ? L.num(val, 1) : L.num(val);
    });
    ctx.save();
    ctx.beginPath(); ctx.rect(a.esq, a.topo, a.dir - a.esq, a.base - a.topo); ctx.clip();
    // Funil: onde 95% das trajetórias devem estar em cada n
    if (e !== null && sd > 0) {
      ctx.beginPath();
      var i, n;
      for (i = 0; i < grade.length; i++) { n = grade[i]; ctx.lineTo(xn(a, n), y(e + 1.96 * sd / Math.sqrt(n))); }
      for (i = grade.length - 1; i >= 0; i--) { n = grade[i]; ctx.lineTo(xn(a, n), y(e - 1.96 * sd / Math.sqrt(n))); }
      ctx.closePath(); ctx.fillStyle = 'rgba(91, 194, 231, 0.16)'; ctx.fill();
    }
    if (e !== null) L.linhaRef(ctx, a.esq, y(e), a.dir, y(e));
    else L.linhaRef(ctx, a.esq, y(0), a.dir, y(0), C.eixo);
    function trilha(tr, cor, alfa, largura) {
      if (!tr.medias.length) return;
      ctx.beginPath();
      for (var j = 0; j < tr.medias.length; j++) {
        var px = xn(a, grade[j]), py = y(tr.medias[j]);
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.strokeStyle = cor; ctx.globalAlpha = alfa; ctx.lineWidth = largura; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (var k = trilhas.length - 1; k >= 1; k--) trilha(trilhas[k], C.ciano, 0.6, 1.25);
    if (trilhas[0]) trilha(trilhas[0], C.ambar, 1, 2);
    if (mira !== null && mira < indice) {
      ctx.strokeStyle = C.eixo; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xn(a, grade[mira]), a.topo); ctx.lineTo(xn(a, grade[mira]), a.base); ctx.stroke();
    }
    ctx.restore();
    eixoN(ctx, a);
  }

  function desenharDiferenca(ctx, Lg, Al) {
    var a = area(Lg, Al), maior = 5;
    for (var i = 0; i < diferencas.length; i++) maior = Math.max(maior, Math.abs(diferencas[i]));
    var marcas = L.marcas(-maior * 1.1, maior * 1.1, 4), teto = Math.max(Math.abs(marcas[0]), marcas[marcas.length - 1], maior);
    var y = L.escala(-teto * 1.05, teto * 1.05, a.base, a.topo);
    L.eixoY(ctx, y, marcas, a.esq, a.dir, function (val) { return L.num(val); });
    L.linhaRef(ctx, a.esq, y(0), a.dir, y(0));
    if (diferencas.length) {
      ctx.beginPath();
      for (var j = 0; j < diferencas.length; j++) {
        var px = xn(a, grade[j]), py = y(diferencas[j]);
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.strokeStyle = C.ambar; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    }
    eixoN(ctx, a);
  }

  function pintar() {
    var t = TIPOS[tipo], e = t.esperado(), n = indice ? grade[indice - 1] : 0, atual = trilhas[0] && trilhas[0].medias.length ? trilhas[0].medias[indice - 1] : null;
    L.escrever('n', L.num(n));
    L.escrever('rotulo-media', t.nome);
    L.escrever('media', atual === null ? '–' : L.num(atual, t.casas));
    L.escrever('esperado', e === null ? 'não existe' : L.num(e, tipo === 'dado' ? 1 : 2));
    var dif = diferencas.length ? diferencas[diferencas.length - 1] : null;
    var inteira = dif !== null && Math.abs(dif - Math.round(dif)) < 1e-6;
    L.escrever('diferenca', e === null || dif === null ? '–' : (dif > 0 ? '+' : '') + L.num(dif, inteira ? 0 : 1));
    L.escrever('titulo-media', t.nome);
    L.escrever('unidade-dif', t.unidade + ' a mais ou a menos que o esperado');
    L.achar('fig-dif').hidden = tipo === 'cauchy';
    L.achar('chave-funil').hidden = tipo === 'cauchy';
    L.achar('chave-esperado').hidden = tipo === 'cauchy';
    L.achar('chave-outras').hidden = pessoas === 1;
    L.achar('campo-p').hidden = tipo !== 'moeda';
    telaMedia.pedir();
    if (tipo !== 'cauchy') telaDif.pedir();
  }

  function definirTipo(novo) { tipo = novo; escolhaTipo.marcar(novo); }
  function definirP(valor) {
    p = valor;
    L.achar('p').value = String(valor);
    L.escrever('p-saida', L.num(valor * 100) + '%');
  }
  function definirPessoas(valor) { pessoas = valor; escolhaPessoas.marcar(valor); }

  var escolhaTipo = L.escolha(L.achar('tipo'), function (valor) { tipo = valor; reiniciar(true); });
  var escolhaPessoas = L.escolha(L.achar('pessoas'), function (valor) { pessoas = Number(valor); reiniciar(true); });
  L.achar('p').addEventListener('input', function (ev) { definirP(Number(ev.target.value)); });
  L.achar('p').addEventListener('change', function () { reiniciar(true); });

  botao.addEventListener('click', function () {
    if (animacao.ligado()) { animacao.desligar(); return; }
    if (indice >= grade.length || !indice) reiniciar(true);
    else if (L.parado) { while (indice < grade.length) passo(); pintar(); botao.textContent = 'Lançar de novo'; }
    else animacao.ligar();
  });
  L.achar('limpar').addEventListener('click', function () { reiniciar(false); });

  L.dica(L.achar('grafico'), function (x) {
    var a = area(telaMedia.L, telaMedia.A);
    if (x < a.esq || x > a.dir || !indice) return null;
    var alvo = Math.pow(10, a.x.inv(x)), i = 0;
    while (i < indice - 1 && grade[i] < alvo) i++;
    mira = i; telaMedia.pedir();
    return 'n = ' + L.num(grade[i]) + ' · ' + L.num(trilhas[0].medias[i], TIPOS[tipo].casas);
  }, function () { mira = null; telaMedia.pedir(); });

  L.desafios({
    honesta: function () { definirTipo('moeda'); definirP(0.5); definirPessoas(20); reiniciar(true); },
    viciada: function () { definirTipo('moeda'); definirP(0.7); definirPessoas(5); reiniciar(true); },
    jogador: function () { definirTipo('moeda'); definirP(0.5); definirPessoas(1); reiniciar(true); },
    falha: function () { definirTipo('cauchy'); definirPessoas(5); reiniciar(true); }
  });

  definirP(0.5);
  reiniciar(true);
})();
