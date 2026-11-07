/* Peças compartilhadas pelos simuladores: tela de desenho, eixos, controles e arraste.
   Sem bibliotecas externas, para abrir rápido no navegador do Instagram. */
(function (w) {
  'use strict';

  var COR = {
    fundo: '#13214a', ciano: '#5bc2e7', ambar: '#f2a93b', branco: '#ffffff',
    texto: '#c9d3e6', grade: '#26386b', eixo: 'rgba(255, 255, 255, 0.45)', apagado: '#3d4f82'
  };
  var MONO = '"Sono", ui-monospace, Consolas, monospace';
  var parado = w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function num(v, casas) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    casas = casas || 0;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }

  function escala(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }

  // Valores redondos para as marcas do eixo
  function marcas(min, max, alvo) {
    var bruto = (max - min) / (alvo || 5), base = Math.pow(10, Math.floor(Math.log10(bruto))), r = bruto / base;
    var passo = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * base, out = [];
    for (var v = Math.ceil(min / passo) * passo; v <= max + passo * 1e-6; v += passo) out.push(Math.round(v / passo) * passo);
    return out;
  }

  // Canvas com nitidez em telas de alta densidade e redesenho ao mudar de tamanho
  function tela(el, desenhar) {
    var t = { el: el, ctx: el.getContext('2d'), L: 0, A: 0 }, pedido = false;
    function medir() {
      var r = el.getBoundingClientRect(), dpr = Math.min(w.devicePixelRatio || 1, 2);
      t.L = r.width; t.A = r.height;
      el.width = Math.round(r.width * dpr); el.height = Math.round(r.height * dpr);
      t.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    t.pintar = function () {
      pedido = false;
      if (!t.L) return;
      t.ctx.clearRect(0, 0, t.L, t.A);
      desenhar(t.ctx, t.L, t.A);
    };
    t.pedir = function () {
      if (pedido) return;
      pedido = true;
      w.requestAnimationFrame(t.pintar);
    };
    medir();
    if ('ResizeObserver' in w) {
      new ResizeObserver(function () {
        var r = el.getBoundingClientRect();
        if (Math.abs(r.width - t.L) > 0.5 || Math.abs(r.height - t.A) > 0.5) { medir(); t.pintar(); }
      }).observe(el);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(t.pedir);
    return t;
  }

  function fonte(ctx, tamanho, peso) { ctx.font = (peso || 400) + ' ' + tamanho + 'px ' + MONO; }

  function texto(ctx, s, x, y, o) {
    o = o || {};
    fonte(ctx, o.tamanho || 12, o.peso);
    ctx.fillStyle = o.cor || COR.texto;
    ctx.textAlign = o.alinhar || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
  }

  // Eixo horizontal com marcas; a linha fica em y
  function eixoX(ctx, x, y, valores, rotulo) {
    var r = x.faixa || [x(valores[0]), x(valores[valores.length - 1])];
    ctx.strokeStyle = COR.eixo; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(r[0], y + 0.5); ctx.lineTo(r[1], y + 0.5); ctx.stroke();
    valores.forEach(function (v) {
      var p = Math.round(x(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(p, y); ctx.lineTo(p, y + 5); ctx.stroke();
      // Rótulos das pontas ficam dentro da tela
      var s = rotulo ? rotulo(v) : num(v);
      fonte(ctx, 12);
      var meia = ctx.measureText(s).width / 2;
      texto(ctx, s, limitar(p, meia, ctx.canvas.clientWidth - meia), y + 18, { alinhar: 'center' });
    });
  }

  // Grade e rótulos do eixo vertical
  function eixoY(ctx, y, valores, x0, x1, rotulo) {
    ctx.lineWidth = 1; ctx.strokeStyle = COR.grade; ctx.setLineDash([]);
    valores.forEach(function (v) {
      var p = Math.round(y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x0, p); ctx.lineTo(x1, p); ctx.stroke();
      texto(ctx, rotulo ? rotulo(v) : num(v), x0 - 6, p, { alinhar: 'right', base: 'middle' });
    });
  }

  function linhaRef(ctx, x0, y0, x1, y1, cor) {
    ctx.save();
    ctx.strokeStyle = cor || COR.branco; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  function ponto(ctx, x, y, r, cor, anel) {
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.3); ctx.fillStyle = anel || COR.fundo; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fillStyle = cor; ctx.fill();
  }

  // Arraste que não trava a rolagem: o toque só é capturado quando começa em um item
  function arrastar(el, o) {
    var ativo = null, inicio = null, moveu = false, id = null;
    function pos(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function distancia(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function limpar() { ativo = null; inicio = null; moveu = false; id = null; }
    el.addEventListener('pointerdown', function (e) {
      var p = pos(e);
      inicio = p; moveu = false; id = e.pointerId;
      ativo = o.achar(p.x, p.y);
      if (ativo !== null && ativo !== undefined) {
        try { el.setPointerCapture(id); } catch (erro) { /* ponteiro já encerrado */ }
        e.preventDefault();
        if (o.pegar) o.pegar(ativo);
      } else ativo = null;
    });
    el.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (ativo === null) {
        if (e.pointerType === 'mouse') { var a = o.achar(p.x, p.y); el.style.cursor = a !== null && a !== undefined ? 'grab' : (o.tocarVazio ? 'crosshair' : ''); }
        return;
      }
      if (e.pointerId !== id) return;
      if (distancia(p, inicio) > 4) moveu = true;
      if (moveu) o.mover(ativo, p.x, p.y);
    });
    el.addEventListener('pointerup', function (e) {
      var p = pos(e);
      if (ativo !== null) { if (o.soltar) o.soltar(ativo, moveu); }
      else if (inicio && distancia(p, inicio) < 8 && o.tocarVazio) o.tocarVazio(p.x, p.y);
      limpar();
    });
    el.addEventListener('pointercancel', function () { if (ativo !== null && o.soltar) o.soltar(ativo, true); limpar(); });
    el.addEventListener('touchstart', function (e) { if (ativo !== null) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchmove', function (e) { if (ativo !== null) e.preventDefault(); }, { passive: false });
  }

  // Caixa de leitura que acompanha o ponteiro sobre o gráfico
  function dica(el, fn, sair) {
    var d = document.createElement('div');
    d.className = 'dica'; d.hidden = true;
    el.parentNode.appendChild(d);
    function esconder() { d.hidden = true; if (sair) sair(); }
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, t = fn(x, y);
      if (!t) { esconder(); return; }
      d.textContent = t; d.hidden = false;
      var base = el.offsetLeft, topo = el.offsetTop;
      d.style.left = limitar(base + x + 12, 0, el.parentNode.clientWidth - d.offsetWidth - 4) + 'px';
      d.style.top = Math.max(0, topo + y - d.offsetHeight - 10) + 'px';
    });
    el.addEventListener('pointerleave', esconder);
    el.addEventListener('pointercancel', esconder);
  }

  // Laço de animação; a função recebe o tempo do quadro e devolve false para parar
  function laco(passo, aoMudar) {
    var ligado = false, antes = 0;
    function quadro(agora) {
      if (!ligado) return;
      var dt = Math.min(agora - antes, 50);
      antes = agora;
      if (passo(dt) === false) { l.desligar(); return; }
      w.requestAnimationFrame(quadro);
    }
    var l = {
      ligar: function () {
        if (ligado) return;
        ligado = true; antes = performance.now();
        w.requestAnimationFrame(quadro);
        if (aoMudar) aoMudar(true);
      },
      desligar: function () {
        if (!ligado) return;
        ligado = false;
        if (aoMudar) aoMudar(false);
      },
      ligado: function () { return ligado; }
    };
    return l;
  }

  // Grupo de botões em que só um fica marcado
  function escolha(el, aoEscolher) {
    var botoes = Array.prototype.slice.call(el.querySelectorAll('button'));
    function marcar(v) { botoes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.valor === String(v))); }); }
    botoes.forEach(function (b) {
      b.addEventListener('click', function () { marcar(b.dataset.valor); aoEscolher(b.dataset.valor); });
    });
    return { marcar: marcar };
  }

  // Cartões de "Experimente": aplicam o cenário e levam a pessoa de volta ao gráfico
  function desafios(mapa) {
    var botoes = Array.prototype.slice.call(document.querySelectorAll('[data-desafio]'));
    botoes.forEach(function (b) {
      b.addEventListener('click', function () {
        mapa[b.dataset.desafio]();
        botoes.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        var alvo = document.querySelector('.bancada');
        if (alvo) alvo.scrollIntoView({ behavior: parado ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  function achar(id) { return document.getElementById(id); }
  function escrever(id, valor) { var e = achar(id); if (e && e.textContent !== valor) e.textContent = valor; }

  w.Lab = {
    COR: COR, parado: parado, limitar: limitar, num: num, escala: escala, marcas: marcas, tela: tela,
    fonte: fonte, texto: texto, eixoX: eixoX, eixoY: eixoY, linhaRef: linhaRef, ponto: ponto,
    arrastar: arrastar, dica: dica, laco: laco, escolha: escolha, desafios: desafios, achar: achar, escrever: escrever
  };
})(window);
