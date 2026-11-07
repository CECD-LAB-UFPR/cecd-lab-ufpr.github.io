/* Falso positivo: o teorema de Bayes em frequências naturais, com 1.000 pessoas desenhadas.
   Os números de pessoas são arredondados; o percentual em destaque usa a conta exata. */
(function () {
  'use strict';
  var E = Estat, L = Lab, C = L.COR;
  var PESSOAS = 1000, COLUNAS = 40, LINHAS = 25, P_MIN = 0.001, P_MAX = 0.99;

  var prev = 0.01, sens = 0.95, espec = 0.95, contagem = null, repeticoes = 0;
  var tela = L.tela(L.achar('grafico'), desenhar);

  // A prevalência usa escala logarítmica no controle, para caber de 0,1% a 99%
  function deControle(t) { return P_MIN * Math.pow(P_MAX / P_MIN, t); }
  function paraControle(p) { return Math.log(p / P_MIN) / Math.log(P_MAX / P_MIN); }

  function contar() {
    var doentes = Math.round(PESSOAS * prev), vp = Math.round(doentes * sens), fn = doentes - vp;
    var saudaveis = PESSOAS - doentes, fp = Math.round(saudaveis * (1 - espec));
    return { vp: vp, fn: fn, fp: fp, vn: saudaveis - fp };
  }

  function desenhar(ctx, Lg, Al) {
    if (!contagem) return;
    var c = Math.min(Lg / COLUNAS, Al / LINHAS), raio = Math.max(2.4, c * 0.36);
    var x0 = (Lg - c * COLUNAS) / 2 + c / 2, y0 = (Al - c * LINHAS) / 2 + c / 2;
    var limites = [contagem.vp, contagem.vp + contagem.fn, contagem.vp + contagem.fn + contagem.fp];
    for (var i = 0; i < PESSOAS; i++) {
      var col = Math.floor(i / LINHAS), lin = i % LINHAS, x = x0 + col * c, y = y0 + lin * c;
      ctx.beginPath(); ctx.arc(x, y, raio, 0, 6.3);
      if (i < limites[0]) { ctx.fillStyle = C.ciano; ctx.fill(); }
      else if (i < limites[1]) {
        ctx.beginPath(); ctx.arc(x, y, raio - 0.75, 0, 6.3);
        ctx.strokeStyle = C.ciano; ctx.lineWidth = 1.5; ctx.stroke();
      }
      else if (i < limites[2]) { ctx.fillStyle = C.ambar; ctx.fill(); }
      else { ctx.fillStyle = C.apagado; ctx.fill(); }
    }
  }

  function ter(q) { return q === 1 ? ' tem' : ' têm'; }

  function pintar() {
    contagem = contar();
    var vpp = E.valorPreditivoPositivo(prev, sens, espec), vpn = E.valorPreditivoNegativo(prev, sens, espec);
    var positivos = contagem.vp + contagem.fp;
    L.escrever('vpp', L.num(vpp * 100, 1) + '%');
    L.escrever('vpp-frase', positivos
      ? 'Em 1.000 pessoas, cerca de ' + L.num(positivos) + (positivos === 1 ? ' testa' : ' testam') + ' positivo. Dessas, cerca de ' + L.num(contagem.vp) + ter(contagem.vp) + ' a doença e ' + L.num(contagem.fp) + ' não' + ter(contagem.fp) + '.'
      : 'Em 1.000 pessoas, ninguém testaria positivo com estes valores.');
    L.achar('barra-vp').style.flexGrow = String(contagem.vp);
    L.achar('barra-fp').style.flexGrow = String(contagem.fp);
    L.achar('barra-vp').hidden = !contagem.vp;
    L.achar('barra-fp').hidden = !contagem.fp;
    L.escrever('vp', L.num(contagem.vp)); L.escrever('fp', L.num(contagem.fp));
    L.escrever('fn', L.num(contagem.fn)); L.escrever('vn', L.num(contagem.vn));
    L.escrever('vpn', 'Valor preditivo negativo: ' + L.num(vpn * 100, 2) + '%');
    L.escrever('prev-saida', L.num(prev * 100, prev < 0.1 ? 1 : 0) + '%');
    L.escrever('sens-saida', L.num(sens * 100, 1) + '%');
    L.escrever('espec-saida', L.num(espec * 100, 1) + '%');
    L.escrever('repetido', repeticoes ? 'Depois de ' + (repeticoes + 1) + ' testes positivos seguidos.' : ' ');
    L.achar('grafico').setAttribute('aria-label', 'Mil pessoas: ' + contagem.vp + ' verdadeiros positivos, ' + contagem.fp + ' falsos positivos, ' + contagem.fn + ' casos perdidos e ' + contagem.vn + ' verdadeiros negativos.');
    tela.pedir();
  }

  function definir(p, s, e) {
    prev = p; sens = s; espec = e; repeticoes = 0;
    L.achar('prev').value = String(paraControle(p));
    L.achar('sens').value = String(s);
    L.achar('espec').value = String(e);
    pintar();
  }

  L.achar('prev').addEventListener('input', function (ev) { prev = deControle(Number(ev.target.value)); repeticoes = 0; pintar(); });
  L.achar('sens').addEventListener('input', function (ev) { sens = Number(ev.target.value); repeticoes = 0; pintar(); });
  L.achar('espec').addEventListener('input', function (ev) { espec = Number(ev.target.value); repeticoes = 0; pintar(); });

  // Quem testou positivo vira o novo grupo: o resultado passa a ser a prevalência do próximo teste
  function repetir() {
    var novo = L.limitar(E.valorPreditivoPositivo(prev, sens, espec), P_MIN, P_MAX), vezes = repeticoes + 1;
    definir(novo, sens, espec);
    repeticoes = vezes;
    pintar();
  }
  L.achar('repetir').addEventListener('click', repetir);
  L.achar('voltar').addEventListener('click', function () { definir(0.01, 0.95, 0.95); });

  L.desafios({
    rara: function () { definir(0.01, 0.95, 0.95); },
    risco: function () { definir(0.3, 0.95, 0.95); },
    melhor: function () { definir(0.01, 0.95, 0.999); },
    repetir: function () { definir(0.01, 0.95, 0.95); repetir(); }
  });

  definir(0.01, 0.95, 0.95);
})();
