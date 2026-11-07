/* Funções estatísticas usadas pelos simuladores do CECD-Lab.
   Sem dependências. No navegador ficam em window.Estat; no Node, em module.exports. */
(function (raiz) {
  'use strict';

  function soma(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return s; }
  function media(v) { return v.length ? soma(v) / v.length : NaN; }

  // Variância amostral, com divisor n - 1
  function variancia(v) {
    if (v.length < 2) return NaN;
    var m = media(v), s = 0;
    for (var i = 0; i < v.length; i++) s += (v[i] - m) * (v[i] - m);
    return s / (v.length - 1);
  }
  function dp(v) { return Math.sqrt(variancia(v)); }

  function assimetria(v) {
    var n = v.length, m = media(v), m2 = 0, m3 = 0;
    for (var i = 0; i < n; i++) { var d = v[i] - m; m2 += d * d; m3 += d * d * d; }
    m2 /= n; m3 /= n;
    return m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
  }

  // Normal padrão pelo método de Box-Muller
  var reserva = null;
  function normal() {
    if (reserva !== null) { var r = reserva; reserva = null; return r; }
    var u = 0, v = Math.random();
    while (u === 0) u = Math.random();
    var raio = Math.sqrt(-2 * Math.log(u));
    reserva = raio * Math.sin(2 * Math.PI * v);
    return raio * Math.cos(2 * Math.PI * v);
  }

  function densidadeNormal(x, mu, sigma) {
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  // Quantil da normal padrão (algoritmo de Acklam, erro relativo próximo de 1e-9)
  function quantilNormal(p) {
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    var b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    var c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    var q, r;
    if (p < 0.02425) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - 0.02425) return -quantilNormal(1 - p);
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function logGama(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }

  // Beta incompleta regularizada, por fração continuada
  function fracaoBeta(x, a, b) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= 200; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      var delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-12) break;
    }
    return h;
  }
  function betaIncompleta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGama(a + b) - logGama(a) - logGama(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * fracaoBeta(x, a, b) / a;
    return 1 - bt * fracaoBeta(1 - x, b, a) / b;
  }

  function acumuladaT(t, gl) {
    var x = gl / (gl + t * t), cauda = 0.5 * betaIncompleta(x, gl / 2, 0.5);
    return t > 0 ? 1 - cauda : cauda;
  }

  // Quantil da t de Student por bissecção
  function quantilT(p, gl) {
    if (p === 0.5) return 0;
    if (p < 0.5) return -quantilT(1 - p, gl);
    var baixo = 0, alto = 1;
    while (acumuladaT(alto, gl) < p) alto *= 2;
    for (var i = 0; i < 80; i++) {
      var meio = (baixo + alto) / 2;
      if (acumuladaT(meio, gl) < p) baixo = meio; else alto = meio;
    }
    return (baixo + alto) / 2;
  }

  function correlacao(x, y) {
    var n = x.length, mx = media(x), my = media(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) {
      var a = x[i] - mx, b = y[i] - my;
      sxy += a * b; sxx += a * a; syy += b * b;
    }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
  }

  // Reta de mínimos quadrados: y = a + b x
  function regressao(x, y) {
    var n = x.length, mx = media(x), my = media(y), sxy = 0, sxx = 0;
    for (var i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); }
    var b = sxx > 0 ? sxy / sxx : NaN;
    return { a: my - b * mx, b: b };
  }

  // Valor preditivo positivo pelo teorema de Bayes
  function valorPreditivoPositivo(prevalencia, sensibilidade, especificidade) {
    var vp = prevalencia * sensibilidade, fp = (1 - prevalencia) * (1 - especificidade);
    return vp + fp > 0 ? vp / (vp + fp) : 0;
  }
  function valorPreditivoNegativo(prevalencia, sensibilidade, especificidade) {
    var vn = (1 - prevalencia) * especificidade, fn = prevalencia * (1 - sensibilidade);
    return vn + fn > 0 ? vn / (vn + fn) : 0;
  }

  var Estat = {
    soma: soma, media: media, variancia: variancia, dp: dp, assimetria: assimetria,
    normal: normal, densidadeNormal: densidadeNormal, quantilNormal: quantilNormal,
    acumuladaT: acumuladaT, quantilT: quantilT, correlacao: correlacao, regressao: regressao,
    valorPreditivoPositivo: valorPreditivoPositivo, valorPreditivoNegativo: valorPreditivoNegativo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Estat;
  else raiz.Estat = Estat;
})(this);
