/* =============================================================
   TSUNAMI — waves-gl.js
   Olas Hokusai en WebGL crudo (sin Three.js, sin dependencias).
   Reemplaza el motor canvas-2D en las secciones oscuras si hay
   WebGL disponible; si no, main.js corre el 2D como fallback.

   - Mismo contrato de vida que el motor 2D: un rAF, pausa por
     IntersectionObserver, pausa en pestaña oculta, velocidad
     narrativa (gaussiana centrada en el Acto II) + boost por scroll.
   - reduced-motion: un frame estático y se apaga.
   - Look editorial (DEC-008): bandas planas de ola con borde suave,
     ondulación fbm sutil, paleta Hokusai fija, grano integrado.
   ============================================================= */
(function () {
  "use strict";

  var VERT = [
    "attribute vec2 a_pos;",
    "void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "uniform vec2 u_res;",
    "uniform float u_time;",
    "uniform float u_amp;",     // intensidad global (1 = normal)
    // Paleta Hokusai (rgb 0-1)
    "const vec3 C_WAVE = vec3(0.1176, 0.3529, 0.7059);", // #1E5AB4
    "const vec3 C_MUST = vec3(0.7608, 0.5725, 0.3216);", // #C29252
    "const vec3 C_TERR = vec3(0.7961, 0.2941, 0.1922);", // #CB4B31
    "",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }",
    "float noise(vec2 p){",
    "  vec2 i = floor(p), f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),",
    "             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);",
    "}",
    "float fbm(vec2 p){",
    "  float v = 0.0, a = 0.5;",
    "  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }",
    "  return v;",
    "}",
    "",
    // Cresta de ola: seno compuesto + fbm orgánico. Devuelve 0..1 (relleno bajo la cresta, borde suave).
    "float band(vec2 uv, float baseY, float amp, float len, float sp, float t){",
    "  float ph = t * sp;",
    "  float y = baseY",
    "    + sin(uv.x * len + ph) * amp",
    "    + sin(uv.x * len * 0.5 + ph * 0.6) * amp * 0.4",
    "    + (fbm(vec2(uv.x * 2.6 + ph * 0.12, baseY * 7.0)) - 0.5) * amp * 0.8;",
    "  float edge = 0.010 + amp * 0.06;", // borde más suave cuanto más alta la ola
    "  return smoothstep(y + edge, y - edge, uv.y) ;",
    "}",
    "",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  uv.y = 1.0 - uv.y;", // y hacia abajo, como el motor 2D
    "  float t = u_time;",
    // Acumulación premultiplied "over", igual que source-over del canvas 2D
    "  vec4 acc = vec4(0.0);",
    "  float m; float ba;",
    // 4 bandas — misma partitura que el motor 2D (color · alpha · amp · long · baseY · vel)
    "  m = band(uv, 0.34, 0.09 * u_amp, 6.91, 1.00, t); ba = 0.15 * m; acc = acc * (1.0 - ba) + vec4(C_WAVE * ba, ba);",
    "  m = band(uv, 0.58, 0.10 * u_amp, 5.65, 0.78, t); ba = 0.12 * m; acc = acc * (1.0 - ba) + vec4(C_WAVE * ba, ba);",
    "  m = band(uv, 0.74, 0.07 * u_amp, 8.17, 1.20, t); ba = 0.09 * m; acc = acc * (1.0 - ba) + vec4(C_MUST * ba, ba);",
    "  m = band(uv, 0.88, 0.05 * u_amp, 10.05, 1.45, t); ba = 0.06 * m; acc = acc * (1.0 - ba) + vec4(C_TERR * ba, ba);",
    // Grano sutil integrado (evita banding; solo modula lo ya pintado)
    "  float g = 1.0 + (hash(gl_FragCoord.xy) - 0.5) * 0.06;",
    "  gl_FragColor = vec4(acc.rgb * g, acc.a);", // premultiplied
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[waves-gl]", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function mount(cv) {
    var gl = null;
    try {
      gl = cv.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: "low-power" })
        || cv.getContext("experimental-webgl");
    } catch (_) {}
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    // Triángulo fullscreen
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    return {
      cv: cv, gl: gl, vis: true, w: 0, h: 0,
      uRes: gl.getUniformLocation(prog, "u_res"),
      uTime: gl.getUniformLocation(prog, "u_time"),
      uAmp: gl.getUniformLocation(prog, "u_amp")
    };
  }

  /* init(): monta el shader en todos los [data-wave]. Devuelve true si
     al menos uno quedó en WebGL (main.js entonces NO arranca el 2D). */
  function init() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-wave]"));
    if (!nodes.length) return false;

    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5); // los fondos no necesitan más
    var ctxs = [];
    nodes.forEach(function (cv) {
      var o = mount(cv);
      if (o) ctxs.push(o);
    });
    if (!ctxs.length) return false;

    function resize() {
      ctxs.forEach(function (o) {
        var r = o.cv.getBoundingClientRect();
        o.w = Math.max(1, Math.round(r.width * dpr));
        o.h = Math.max(1, Math.round(r.height * dpr));
        if (o.cv.width !== o.w) o.cv.width = o.w;
        if (o.cv.height !== o.h) o.cv.height = o.h;
        o.gl.viewport(0, 0, o.w, o.h);
      });
    }
    function drawOne(o, phase) {
      var gl = o.gl;
      gl.uniform2f(o.uRes, o.w, o.h);
      gl.uniform1f(o.uTime, phase);
      gl.uniform1f(o.uAmp, 1.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function drawAll(phase) {
      ctxs.forEach(function (o) { if (o.vis && o.w && o.h) drawOne(o, phase); });
    }

    resize();
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(function () { resize(); drawAll(phaseVal); }, 150);
    }, { passive: true });
    window.addEventListener("load", function () { resize(); drawAll(phaseVal); });

    var phaseVal = 0.6;
    if (reduced) { // frame estático, igual que el 2D
      ctxs.forEach(function (o) { o.vis = true; });
      drawAll(phaseVal);
      return true;
    }

    // Velocidad narrativa: gaussiana centrada en el Acto II (mismo motor que el 2D)
    var anchor = document.querySelector("#proceso");
    function baseSpeed() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var prog = docH > 0 ? (window.scrollY / docH) : 0;
      var peak = anchor && docH > 0
        ? Math.min(0.85, Math.max(0.2, anchor.offsetTop / docH)) : 0.42;
      var d = (prog - peak) / 0.35;
      return 0.35 + 1.25 * Math.exp(-d * d);
    }

    var running = false, rafId = 0, lastT = 0, lastScroll = window.scrollY || 0, boost = 0;
    function loop(t) {
      if (!running) return;
      if (!lastT) lastT = t;
      var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      var sy = window.scrollY || 0;
      boost += Math.abs(sy - lastScroll) * 0.0025; lastScroll = sy;
      boost *= 0.90; if (boost > 3) boost = 3;
      phaseVal += dt * (baseSpeed() + boost) * 1.6;
      drawAll(phaseVal);
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (running) return; running = true; lastT = 0; rafId = requestAnimationFrame(loop); }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    window.__waveSpeed = function () { return baseSpeed() + boost; };
    window.__wavesGLActive = true; // para verificación

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          for (var i = 0; i < ctxs.length; i++) {
            if (ctxs[i].cv === en.target) { ctxs[i].vis = en.isIntersecting; break; }
          }
        });
        if (ctxs.some(function (o) { return o.vis; })) start(); else stop();
      }, { threshold: 0.01 });
      ctxs.forEach(function (o) { o.vis = false; io.observe(o.cv); });
    } else {
      ctxs.forEach(function (o) { o.vis = true; });
      start();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (ctxs.some(function (o) { return o.vis; })) start();
    });

    return true;
  }

  window.__WavesGL = { init: init };
})();
