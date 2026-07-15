/* =============================================================
   TSUNAMI — main.js (IIFE, classic script, no modules)
   Contenido vive en el HTML; aquí solo enriquecemos.
   ============================================================= */
(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var $  = function (s, sc) { return (sc || document).querySelector(s); };
  var $$ = function (s, sc) { return Array.prototype.slice.call((sc || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  /* ---- Intro: zoom a través del logo + entrada del contenido ----
     Interrumpible (skip con cualquier interacción), reduced-motion = fade corto,
     doble red de seguridad (aquí + CSS @4.5s). */
  function initIntro() {
    var splash = $("[data-splash]");
    var main = $("#contenido");

    // Entrada del contenido (solo si hay movimiento permitido)
    if (main && !reduced) {
      main.classList.add("page-enter");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { main.classList.add("is-entered"); });
      });
      setTimeout(function () { main.classList.add("is-entered"); }, 1600); // safety
    }

    if (!splash) return;
    var done = false;

    function finish() {
      if (done) return; done = true;
      splash.classList.add("is-out");
      setTimeout(function () { splash.style.display = "none"; }, 800);
    }
    function startZoom() {
      if (done) return;
      if (reduced) { finish(); return; }
      splash.classList.add("is-zooming");
      setTimeout(finish, 1000); // duración del zoom
    }

    // Lanzar el intro al cargar
    if (document.readyState === "complete") setTimeout(startZoom, 350);
    else window.addEventListener("load", function () { setTimeout(startZoom, 250); });

    // Interrumpible: cualquier interacción salta el intro de inmediato
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, finish, { once: true, passive: true });
    });

    // Seguridad extra
    setTimeout(startZoom, 3000);
    setTimeout(finish, 4200);
  }

  /* ---- Nav: solidifica al hacer scroll + menú móvil ---- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $("[data-nav-toggle]");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      });
      $$(".nav-links a", nav).forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ---- Smooth scroll nativo para anclas ---- */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---- Reveals on scroll (IntersectionObserver + red de seguridad) ---- */
  function initReveals() {
    var items = $$(".reveal:not([data-split])");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -4% 0px" });
    items.forEach(function (el) { io.observe(el); });

    // Seguridad: a los 6s revela cualquier cosa visible aún oculta
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---- Split reveal: titulares palabra por palabra ----
     Parte los [data-split] en spans (respetando <br> y spans anidados
     como .accent-italic) y los escalona al entrar en viewport.
     Sin JS, sin IO o con reduced-motion: el texto queda intacto. */
  function initSplitReveal() {
    var heads = $$("[data-split]");
    if (!heads.length) return;
    if (reduced || !("IntersectionObserver" in window)) return;

    function split(root) {
      var count = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var parts = child.textContent.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement("span");
              w.className = "split-word";
              w.style.setProperty("--i", String(count++));
              w.textContent = part;
              frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== "BR") {
            walk(child);
          }
        });
      })(root);
      return count;
    }

    heads.forEach(function (el) {
      if (split(el) > 0) el.classList.add("is-split");
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("split-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -6% 0px" });

    // Observamos tras el splash para que el hero no se anime tapado
    setTimeout(function () {
      heads.forEach(function (el) { io.observe(el); });
    }, 900);

    // Seguridad: nada se queda oculto pase lo que pase
    setTimeout(function () {
      heads.forEach(function (el) { el.classList.add("split-in"); });
    }, 6000);
  }

  /* ---- Proceso scroll-driven (Storyboard - El Proceso) ----
     Etapa pinned con GSAP ScrollTrigger: cada paso entra como número
     gigante + panel; al soltar el pin, el grid .steps hace de
     "acomodo en fila". También en móvil (2026-07-07): la misma
     experiencia que en desktop, en una columna. Requiere movimiento
     permitido y GSAP; si no, el grid .steps es la experiencia completa. */
  function initProcessJourney() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    var journey = $("[data-proc]");
    if (!journey) return;

    var pin = $("[data-proc-pin]", journey);
    var panels = $$(".proc-panel", journey);
    var numEl = $("[data-proc-num]", journey);
    var bar = $("[data-proc-bar]", journey);
    var dots = $$(".proc-dots b", journey);
    if (!pin || panels.length < 2) return;

    journey.removeAttribute("hidden");
    document.documentElement.classList.add("proc-on");

    var current = 0;
    function setStep(idx) {
      if (idx === current) return;
      current = idx;
      panels.forEach(function (p, i) {
        p.classList.toggle("is-active", i === idx);
        p.classList.toggle("is-passed", i < idx);
      });
      dots.forEach(function (d, i) { d.classList.toggle("is-on", i === idx); });
      if (numEl) {
        // Texto inmediato: con scrub rápido los setTimeout se encimaban
        // y el número quedaba desfasado del paso.
        numEl.textContent = "0" + (idx + 1);
        numEl.classList.remove("is-swapping");
        void numEl.offsetWidth; // reinicia la animación de entrada
        numEl.classList.add("is-swapping");
      }
    }

    ScrollTrigger.create({
      trigger: journey,
      pin: pin,
      start: "top 12%",
      end: "+=" + (panels.length * 80) + "%",
      scrub: true,
      anticipatePin: 1,
      onUpdate: function (self) {
        var n = panels.length;
        var idx = Math.min(n - 1, Math.floor(self.progress * n));
        setStep(idx);
        if (bar) bar.style.setProperty("--p", String(self.progress));
      }
    });

    // Las alturas cambian después del boot (entrada de página, videos,
    // fuentes); sin re-medir, el pin arranca/suelta desalineado.
    window.addEventListener("load", function () {
      setTimeout(function () { ScrollTrigger.refresh(); }, 400);
      setTimeout(function () { ScrollTrigger.refresh(); }, 2000);
    });
  }

  /* ---- Transición de color por scroll: un solo fondo en el <body> ----
     Las secciones no pintan fondo (html.tint-on en CSS); el body lleva
     UN color que se interpola al cruzar cada frontera de acto. Al ser
     una sola capa, no existe costura posible entre secciones. La cadena
     es continua: el "from" de cada parada = el "to" de la anterior.
     Sin GSAP o con reduced-motion no se activa y queda el corte clásico. */
  function initActTint() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    var stops = [
      { sel: "#proceso",    from: "#F5F2E9", to: "#003153" }, // crema → prusia
      { sel: "#resultados", from: "#003153", to: "#F5F2E9" }, // prusia → crema
      { sel: "#equipo",     from: "#F5F2E9", to: "#e8e3d5" }, // crema → crema alt
      { sel: "#contacto",   from: "#e8e3d5", to: "#003153" }  // crema alt → prusia
    ];
    var body = document.body;
    var trigs = [];

    stops.forEach(function (p) {
      var el = $(p.sel);
      if (!el) return;
      var mix = gsap.utils.interpolate(p.from, p.to);
      var paint = function (self) { body.style.backgroundColor = mix(self.progress); };
      trigs.push({
        st: ScrollTrigger.create({
          trigger: el, start: "top 90%", end: "top 45%",
          scrub: true, onUpdate: paint
        }),
        paint: paint
      });
    });
    if (!trigs.length) return;

    // Tras cada refresh (load, resize, re-medición del pin) repinta el
    // color correcto para la posición actual: la última parada iniciada.
    ScrollTrigger.addEventListener("refresh", function () {
      var last = null;
      trigs.forEach(function (t) { if (t.st.progress > 0) last = t; });
      if (last) last.paint(last.st);
      else body.style.backgroundColor = "";
    });

    document.documentElement.classList.add("tint-on");
  }

  /* ---- Nav según acto: invierte colores sobre secciones oscuras ----
     Contador (no toggle directo) por si dos triggers se solapan al
     re-medir. El footer también es .act-storm y cuenta. */
  function initNavTheme() {
    if (!window.gsap || !window.ScrollTrigger) return;
    var nav = $("[data-nav]");
    if (!nav) return;
    var dark = 0;
    $$(".act-storm").forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: "top 64px", end: "bottom 64px",
        onToggle: function (self) {
          dark += self.isActive ? 1 : -1;
          nav.classList.toggle("over-dark", dark > 0);
        }
      });
    });
  }

  /* ---- Parallax sutil del hero: el contenido sube más lento y se
     desvanece al salir. Barato (un solo tween con scrub). ---- */
  function initHeroParallax() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    var hero = $(".hero"), inner = $(".hero-inner");
    if (!hero || !inner) return;
    gsap.to(inner, {
      yPercent: -14, opacity: 0.25, ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom 30%", scrub: true }
    });
  }

  /* ---- Cursor: aro de marca que sigue al puntero (lerp) ----
     Solo pointer:fine y con movimiento permitido. No oculta el cursor
     nativo. Crece sobre elementos interactivos. */
  function initCursor() {
    if (reduced || !matchMedia("(pointer: fine)").matches) return;
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    var x = -100, y = -100, rx = -100, ry = -100, rafId = 0;
    function loop() {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px) translate(-50%,-50%)";
      rafId = requestAnimationFrame(loop);
    }
    document.addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!rafId) { rx = x; ry = y; rafId = requestAnimationFrame(loop); }
      ring.classList.add("is-on");
    }, { passive: true });

    // Se esconde al salir de la ventana (o al caer sobre un iframe)
    document.documentElement.addEventListener("mouseleave", function () {
      ring.classList.remove("is-on");
    });
    // Crece sobre interactivos
    document.addEventListener("mouseover", function (e) {
      var hit = e.target.closest && e.target.closest("a, button, input, select, textarea, [role='button']");
      ring.classList.toggle("is-active", !!hit);
    });
    // Pausa el rAF con la pestaña oculta
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      else if (!document.hidden && !rafId) rafId = requestAnimationFrame(loop);
    });
  }

  /* ---- Vitrina incrustada (DEC-012): facade → embed de IG al clic ----
     Nada de salidas a plataformas externas; el post vive en la página.
     El iframe solo se crea cuando el usuario lo pide (peso cero inicial). */
  function initEmbedFacades() {
    $$("[data-ig]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-ig");
        if (!id) return;
        var wrap = document.createElement("div");
        wrap.className = "embed-live";
        var f = document.createElement("iframe");
        f.src = "https://www.instagram.com/p/" + id + "/embed/";
        f.title = btn.getAttribute("aria-label") || "Publicación incrustada";
        f.loading = "lazy";
        f.setAttribute("allowfullscreen", "");
        f.setAttribute("scrolling", "no");
        wrap.appendChild(f);
        btn.replaceWith(wrap);
      }, { once: true });
    });
  }

  /* ---- WhatsApp: arma el link desde manifest ---- */
  function initWhatsApp() {
    var c = data.contact || {};
    if (!c.whatsapp) return;
    var href = "https://wa.me/" + c.whatsapp + (c.whatsappMsg ? "?text=" + encodeURIComponent(c.whatsappMsg) : "");
    $$("[data-wa]").forEach(function (a) { a.setAttribute("href", href); a.setAttribute("target", "_blank"); });
  }

  /* ---- Formulario: validación + envío a Supabase ----
     La inserción vive en lib/lead-insert.js (helper compartido con
     estudio.html). Aquí solo orquestamos UI + tipo_solicitud. El form
     puede declarar su intención con data-tipo-solicitud; default a
     'idea_completa' (esta es la landing del cliente-idea). */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;
    var msg = $("[data-form-msg]", form);
    var tipo = form.getAttribute("data-tipo-solicitud") || "idea_completa";
    var btnLabel = null;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var btn = $('button[type="submit"]', form);
      if (btn) { btnLabel = btnLabel || btn.textContent; btn.disabled = true; btn.textContent = "Enviando…"; }

      var fd = new FormData(form);
      var lead = {
        nombre: fd.get("nombre"),
        email: fd.get("email"),
        telefono: fd.get("telefono"),
        mensaje: fd.get("mensaje"),
        tipo_solicitud: tipo
      };

      try {
        if (typeof window.__tsunamiInsertLead !== "function") {
          throw new Error("lead-insert.js no cargó");
        }
        await window.__tsunamiInsertLead(lead);
        form.reset();
        if (msg) { msg.textContent = "¡Listo! Te contactaremos pronto."; msg.classList.add("is-ok"); }
      } catch (error) {
        console.error("Error al guardar el lead:", error);
        if (msg) { msg.textContent = "Hubo un error al enviar. Por favor, contáctanos por WhatsApp."; msg.classList.remove("is-ok"); }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel || "Enviar"; }
      }
    });
  }

  /* ---- Año del footer ---- */
  function initYear() {
    $$("[data-year]").forEach(function (el) {
      // Date.now no disponible en algunos entornos; usar new Date directo en navegador real
      try { el.textContent = String(new Date().getFullYear()); } catch (_) {}
    });
  }

  /* ---- Fondos de video: reproduce solo la sección visible ----
     Evita decodificar varios videos a la vez (rendimiento). Los videos
     del Hero/Proceso traen autoplay como fallback sin-JS; aquí los
     gobernamos a todos por visibilidad. reduced-motion = pausados. */
  function initBgVideos() {
    // Incluye los clips reales de Leo (proceso + director, DEC-016):
    // preload="none" + play solo al entrar en viewport = peso inicial cero.
    var vids = $$("video.bg-video, video.proc-video, video.director-video");
    if (!vids.length) return;
    if (reduced) {
      vids.forEach(function (v) { try { v.removeAttribute("autoplay"); v.pause(); } catch (_) {} });
      return;
    }
    function play(v) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (_) {} }
    function pause(v) { try { v.pause(); } catch (_) {} }

    if (!("IntersectionObserver" in window)) { vids.forEach(play); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) play(en.target); else pause(en.target);
      });
    }, { threshold: 0.01 });
    vids.forEach(function (v) { pause(v); io.observe(v); });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) vids.forEach(pause);
    });
  }

  /* ---- Film strip (DEC-016): deriva horizontal de fotos por scroll ----
     La tira recorre su ancho sobrante mientras la sección cruza el
     viewport. Sin GSAP o con reduced-motion no se activa (html sin
     .strip-on) y la tira queda como carrusel de scroll nativo. */
  function initFilmstrip() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    var strip = $("[data-strip]");
    if (!strip) return;
    document.documentElement.classList.add("strip-on");
    var span = function () {
      return Math.max(0, strip.scrollWidth - document.documentElement.clientWidth);
    };
    gsap.fromTo(strip, { x: 0 }, {
      x: function () { return -span(); },
      ease: "none",
      scrollTrigger: {
        trigger: strip.parentElement,
        start: "top bottom", end: "bottom top",
        scrub: true, invalidateOnRefresh: true
      }
    });
  }

  /* ---- Motor de olas: canvas en secciones oscuras ----
     Un solo rAF para todos los canvas. Velocidad = base narrativa (pico en Acto II)
     + boost por scroll activo. Pausa fuera de viewport / pestaña oculta.
     reduced-motion = un frame estático. Fallback: sin canvas, queda el fondo prusia. */
  function initWaveEngine() {
    // WebGL primero (lib/waves-gl.js); este motor 2D queda como fallback.
    try {
      if (window.__WavesGL && window.__WavesGL.init()) return;
    } catch (e) { console.warn("[waves-gl→2D fallback]", e); }
    var nodes = $$("[data-wave]");
    if (!nodes.length) return;

    var ctxs = [];
    nodes.forEach(function (cv) {
      var ctx = null;
      try { ctx = cv.getContext("2d"); } catch (_) {}
      if (ctx) ctxs.push({ cv: cv, ctx: ctx, w: 0, h: 0, vis: true });
    });
    if (!ctxs.length) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Bandas Hokusai (r,g,b · alpha · amplitud · longitud · baseY · velocidad relativa)
    // Repartidas en altura para que el tema de olas se sienta en toda la sección oscura.
    var bands = [
      { c: "30,90,180",  a: 0.15, amp: 0.09, len: 1.1, yo: 0.34, sp: 1.00 }, // azul ola (alto)
      { c: "30,90,180",  a: 0.12, amp: 0.10, len: 0.9, yo: 0.58, sp: 0.78 }, // azul ola (medio)
      { c: "194,146,82", a: 0.09, amp: 0.07, len: 1.3, yo: 0.74, sp: 1.20 }, // mostaza
      { c: "203,75,49",  a: 0.06, amp: 0.05, len: 1.6, yo: 0.88, sp: 1.45 }  // terracota (toque)
    ];

    function resize() {
      ctxs.forEach(function (o) {
        var r = o.cv.getBoundingClientRect();
        o.w = Math.max(1, r.width); o.h = Math.max(1, r.height);
        o.cv.width = Math.round(o.w * dpr); o.cv.height = Math.round(o.h * dpr);
        o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    }
    function drawOne(o, phase) {
      var w = o.w, h = o.h, ctx = o.ctx;
      ctx.clearRect(0, 0, w, h);
      for (var b = 0; b < bands.length; b++) {
        var band = bands[b], baseY = h * band.yo, amp = h * band.amp;
        var k = (Math.PI * 2 * band.len) / w;
        ctx.beginPath(); ctx.moveTo(0, h);
        for (var x = 0; x <= w; x += 8) {
          var y = baseY
            + Math.sin(x * k + phase * band.sp) * amp
            + Math.sin(x * k * 0.5 + phase * band.sp * 0.6) * amp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.closePath();
        ctx.fillStyle = "rgba(" + band.c + "," + band.a + ")"; ctx.fill();
      }
    }
    function drawAll(phase) {
      ctxs.forEach(function (o) { if (o.w && o.h && o.vis) drawOne(o, phase); });
    }

    resize();
    var phaseVal = 0;
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt); rt = setTimeout(function () { resize(); drawAll(phaseVal); }, 150);
    }, { passive: true });
    window.addEventListener("load", function () { resize(); drawAll(phaseVal); });

    // reduced-motion: un frame estático y fuera
    if (reduced) { drawAll(0.6); return; }

    var anchor = $("#proceso"); // pico narrativo en Acto II
    function baseSpeed() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var prog = docH > 0 ? (window.scrollY / docH) : 0;
      var peak = anchor && docH > 0
        ? Math.min(0.85, Math.max(0.2, anchor.offsetTop / docH)) : 0.42;
      var d = (prog - peak) / 0.35;
      return 0.35 + 1.25 * Math.exp(-d * d); // gaussiana centrada en el Acto II
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

    // exponer velocidad para verificación
    window.__waveSpeed = function () { return baseSpeed() + boost; };

    // Pausa cuando ninguna sección oscura está visible
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
      start();
    }
    // Pausa en pestaña oculta
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (ctxs.some(function (o) { return o.vis; })) start();
    });
  }

  function boot() {
    safe(initIntro, "initIntro");
    safe(initNav, "initNav");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initReveals, "initReveals");
    safe(initSplitReveal, "initSplitReveal");
    safe(initCursor, "initCursor");
    safe(initEmbedFacades, "initEmbedFacades");
    safe(initWhatsApp, "initWhatsApp");
    safe(initForm, "initForm");
    safe(initYear, "initYear");
    safe(initBgVideos, "initBgVideos");
    safe(initWaveEngine, "initWaveEngine");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      // iOS/Android: la barra de dirección que se colapsa dispara "resizes"
      // que re-miden los pins a media scrolleada y provocan saltos.
      try { ScrollTrigger.config({ ignoreMobileResize: true }); } catch (_) {}
      safe(initProcessJourney, "initProcessJourney");
      safe(initFilmstrip, "initFilmstrip");
      safe(initActTint, "initActTint");
      safe(initNavTheme, "initNavTheme");
      safe(initHeroParallax, "initHeroParallax");
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
