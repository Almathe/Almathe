/* =====================================================================
   ALMATHE - Interactions premium
   Navbar sticky · menu mobile · scroll-reveal · compteurs animés
   100% défensif + respect de prefers-reduced-motion
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. Header : état "scrolled" ---- */
  var header = document.querySelector(".header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 40);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- 2. Menu mobile (drawer) ---- */
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector(".drawer");
  var closeBtn = document.querySelector(".drawer-close");
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("open");
    document.body.classList.add("no-scroll");
    drawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    document.body.classList.remove("no-scroll");
    drawer.setAttribute("aria-hidden", "true");
  }
  if (burger) burger.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeDrawer);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  /* ---- 3. Scroll-reveal (apparitions) ---- */
  var revealEls = document.querySelectorAll("[data-reveal],[data-reveal-stagger]");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    // cascade pour les conteneurs "stagger"
    document.querySelectorAll("[data-reveal-stagger]").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.transitionDelay = Math.min(i * 90, 450) + "ms";
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
    // sécurité
    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    }, 3000);
  }

  /* ---- 4. Compteurs animés ---- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1500, start = null;
    if (reduce) { el.textContent = target + suffix; return; }
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---- 5. Année du footer ---- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---- 6. Formulaire de contact (démo sans backend) ---- */
  var form = document.querySelector("form[data-contact]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var note = form.querySelector(".form-note");
      if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }
      // Repli mailto : ouvre le client mail avec le message pré-rempli
      var data = new FormData(form);
      var subject = encodeURIComponent("Demande de contact de " + (data.get("nom") || ""));
      var body = encodeURIComponent(
        "Nom : " + (data.get("nom") || "") + "\n" +
        "Entreprise : " + (data.get("entreprise") || "") + "\n" +
        "Email : " + (data.get("email") || "") + "\n\n" +
        (data.get("message") || "")
      );
      window.location.href = "mailto:contact@almathe.net?subject=" + subject + "&body=" + body;
      if (note) note.textContent = "Votre logiciel de messagerie va s’ouvrir pour finaliser l’envoi.";
      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Envoyer ma demande"; }
      }, 1500);
    });
  }
})();

/* ---- 10. Chatbot gratuit local ---- */
(function () {
  "use strict";
  if (document.querySelector(".site-bot")) return;

  var bot = document.createElement("div");
  bot.className = "site-bot";
  bot.innerHTML =
    "<section class='site-bot-panel' aria-label='Assistant Almathe'>" +
      "<div class='site-bot-head'>" +
        "<div class='site-bot-avatar'>A</div>" +
        "<div><div class='site-bot-title'>Assistant Almathe</div><span class='site-bot-subtitle'>Réponse immédiate, devis sur demande</span></div>" +
        "<button class='site-bot-close' type='button' aria-label='Fermer le chat'>&times;</button>" +
      "</div>" +
      "<div class='site-bot-messages' role='log' aria-live='polite'></div>" +
      "<div class='site-bot-quick' aria-label='Questions fréquentes'>" +
        "<button class='site-bot-chip' type='button' data-q='prestations'>Prestations</button>" +
        "<button class='site-bot-chip' type='button' data-q='devis'>Devis</button>" +
        "<button class='site-bot-chip' type='button' data-q='contact'>Contact</button>" +
      "</div>" +
      "<form class='site-bot-form'>" +
        "<input class='site-bot-input' type='text' autocomplete='off' placeholder='Écrivez votre question...' aria-label='Votre question' />" +
        "<button class='site-bot-send' type='submit' aria-label='Envoyer'>" +
          "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' aria-hidden='true'><path d='M22 2 11 13' stroke-linecap='round' stroke-linejoin='round'/><path d='m22 2-7 20-4-9-9-4 20-7Z' stroke-linecap='round' stroke-linejoin='round'/></svg>" +
        "</button>" +
      "</form>" +
    "</section>" +
    "<button class='site-bot-toggle' type='button' aria-label='Ouvrir le chat' aria-expanded='false'>" +
      "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' aria-hidden='true'><path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z' stroke-linecap='round' stroke-linejoin='round'/></svg>" +
    "</button>";
  document.body.appendChild(bot);

  var toggle = bot.querySelector(".site-bot-toggle");
  var close = bot.querySelector(".site-bot-close");
  var messages = bot.querySelector(".site-bot-messages");
  var form = bot.querySelector(".site-bot-form");
  var input = bot.querySelector(".site-bot-input");
  var scriptSrc = document.currentScript && document.currentScript.src;
  var chatEndpoint = scriptSrc ? new URL("../../api/chat.php", scriptSrc).href : "api/chat.php";

  function addMessage(text, who) {
    var msg = document.createElement("div");
    msg.className = "site-bot-msg " + who;
    msg.innerHTML = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  function openBot() {
    bot.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    setTimeout(function () { input.focus(); }, 120);
  }

  function closeBot() {
    bot.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function answer(raw) {
    var q = raw.toLowerCase();
    if (q.indexOf("devis") >= 0 || q.indexOf("prix") >= 0 || q.indexOf("tarif") >= 0 || q.indexOf("cout") >= 0 || q.indexOf("coût") >= 0) {
      return "Toutes les prestations sont <strong>sur devis</strong>. Le plus simple est de décrire votre besoin ici : <a href='contact.html'>demander un devis</a>.";
    }
    if (q.indexOf("prestation") >= 0 || q.indexOf("service") >= 0 || q.indexOf("pilotage") >= 0 || q.indexOf("compta") >= 0 || q.indexOf("fiscal") >= 0 || q.indexOf("rh") >= 0) {
      return "Almathe accompagne les entreprises en pilotage financier, comptabilité/fiscalité, RH/droit social et projets stratégiques. Vous pouvez voir le détail ici : <a href='prestations.html'>prestations</a>.";
    }
    if (q.indexOf("contact") >= 0 || q.indexOf("rdv") >= 0 || q.indexOf("rendez") >= 0 || q.indexOf("appel") >= 0 || q.indexOf("mail") >= 0) {
      return "Vous pouvez écrire à <a href='mailto:contact@almathe.net'>contact@almathe.net</a>, appeler le <a href='tel:+33638888402'>+33 6 38 88 84 02</a>, ou passer par la page <a href='contact.html'>contact</a>.";
    }
    if (q.indexOf("formation") >= 0) {
      return "La partie formation est disponible ici : <a href='formation.html'>formation</a>. Pour un besoin précis, le devis se fait sur mesure.";
    }
    if (q.indexOf("france") >= 0 || q.indexOf("congo") >= 0 || q.indexOf("hauts") >= 0) {
      return "Almathe intervient en France, notamment dans les Hauts-de-France, et au Congo. Vous pouvez préciser votre zone dans la demande de devis.";
    }
    return "Je peux vous orienter sur les prestations, les devis ou le contact. Pour une réponse personnalisée, envoyez votre besoin via <a href='contact.html'>le formulaire de contact</a>.";
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c];
    }).replace(/\n/g, "<br>");
  }

  function askAssistant(text) {
    return fetch(chatEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    }).then(function (res) {
      if (!res.ok) throw new Error("Assistant indisponible");
      return res.json();
    }).then(function (data) {
      if (!data || !data.reply) throw new Error("Réponse vide");
      return escapeHtml(data.reply);
    }).catch(function () {
      return answer(text);
    });
  }

  toggle.addEventListener("click", function () {
    if (bot.classList.contains("open")) closeBot();
    else openBot();
  });
  close.addEventListener("click", closeBot);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeBot();
  });

  bot.querySelectorAll(".site-bot-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var q = chip.getAttribute("data-q") || chip.textContent;
      openBot();
      addMessage(chip.textContent, "user");
      var pending = addMessage("Je prépare une réponse...", "bot");
      askAssistant(q).then(function (reply) {
        pending.innerHTML = reply;
        messages.scrollTop = messages.scrollHeight;
      });
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    var pending = addMessage("Je prépare une réponse...", "bot");
    askAssistant(text).then(function (reply) {
      pending.innerHTML = reply;
      messages.scrollTop = messages.scrollHeight;
    });
  });

  addMessage("Bonjour, je peux vous aider à trouver une prestation, comprendre le principe du devis ou contacter Almathe.", "bot");
})();

/* ---- 7. Fond d'ondes "frequences" orange (tout le site) ---- */
(function () {
  "use strict";
  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.createElement("canvas");
  canvas.className = "bg-waves";
  canvas.setAttribute("aria-hidden", "true");
  if (document.body.firstChild) document.body.insertBefore(canvas, document.body.firstChild);
  else document.body.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var w = 0, h = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }
  resize();
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); buildLayers(); }, 150);
  }, { passive: true });

  // Des dizaines de frequences INDEPENDANTES reparties sur toute la hauteur :
  // chaque ligne a sa propre longueur d'onde, sa vitesse, sa direction,
  // ses harmoniques et sa respiration, tirees au hasard, sans motif commun.
  var oranges = ["249,115,22", "234,88,12", "251,146,60", "245,158,11", "217,119,6"];
  var layers = [];
  function rnd(min, max) { return min + Math.random() * (max - min); }
  function buildLayers() {
    var COUNT = window.innerWidth < 640 ? 45 : 110;
    layers = [];
    for (var i = 0; i < COUNT; i++) {
      var r = (i + 0.5) / COUNT;                  // position verticale 0..1
      layers.push({
        y: 0.02 + r * 0.96,                        // etale de haut en bas
        amp: rnd(8, 42),                            // amplitude propre
        len: rnd(0.002, 0.013),                    // frequence spatiale propre
        speed: rnd(0.006, 0.045),                  // vitesse propre
        dir: Math.random() < 0.5 ? 1 : -1,         // direction propre
        ph: rnd(0, Math.PI * 2),                   // phase propre
        breath: rnd(0.0015, 0.008),                // respiration propre
        h2: rnd(1.4, 3.2), a2: rnd(0.2, 0.6),      // 2e harmonique propre
        h3: rnd(3.5, 7),   a3: rnd(0.08, 0.3),     // 3e harmonique propre
        rgb: oranges[Math.floor(Math.random() * oranges.length)],
        op: rnd(0.04, 0.10),                       // opacite propre
        lw: rnd(1, 2.4)                            // epaisseur propre
      });
    }
  }
  buildLayers();

  var t = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    var step = 10 * dpr;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      // chaque frequence gonfle et retombe a son propre rythme
      var swell = 0.6 + 0.4 * Math.sin(t * L.breath + L.ph * 2);
      var A = L.amp * swell * dpr;
      ctx.beginPath();
      for (var x = 0; x <= w; x += step) {
        var k = x / dpr;
        var yy = (L.y * h)
          + Math.sin(k * L.len - t * L.speed * L.dir + L.ph) * A
          + Math.sin(k * L.len * L.h2 + t * L.speed * 1.6 * L.dir + L.ph * 1.4) * A * L.a2
          + Math.sin(k * L.len * L.h3 - t * L.speed * 0.7 * L.dir + L.ph * 0.6) * A * L.a3;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      // chaque ligne scintille a son propre rythme
      var o = L.op * (0.7 + 0.3 * Math.sin(t * L.breath * 1.7 + L.ph * 3));
      ctx.strokeStyle = "rgba(" + L.rgb + "," + o.toFixed(3) + ")";
      ctx.lineWidth = L.lw * dpr;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  if (reduce) { draw(); return; }

  // Cadence plafonnee a ~30fps (au lieu du taux d'ecran natif, jusqu'a 120Hz)
  // via un increment de t base sur le temps ecoule, pour garder la meme
  // vitesse de deplacement percue tout en divisant le cout de dessin par ~2-4.
  var FRAME_MS = 1000 / 30;
  var running = true, rafId = null, last = 0;
  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = ts - last;
    if (dt >= FRAME_MS) {
      t += dt * 0.06;
      last = ts;
      draw();
    }
    rafId = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) { last = 0; rafId = requestAnimationFrame(loop); }
    else if (rafId) cancelAnimationFrame(rafId);
  });
  rafId = requestAnimationFrame(loop);
})();
/* ---- 9. Boutons de partage (pages articles uniquement) ---- */
(function () {
  "use strict";
  var og = document.querySelector('meta[property="og:type"]');
  if (!og || og.getAttribute("content") !== "article") return;
  var art = document.querySelector("article.container");
  if (!art) return;

  var canon = document.querySelector('link[rel="canonical"]');
  var url = canon ? canon.href : window.location.href;
  var u = encodeURIComponent(url);
  var titleEl = document.querySelector('meta[property="og:title"]');
  var descEl = document.querySelector('meta[property="og:description"]');
  var title = titleEl ? titleEl.getAttribute("content") : document.title;
  var desc = descEl ? descEl.getAttribute("content") : "";
  var tt = encodeURIComponent(title);
  var fb = "https://www.facebook.com/sharer/sharer.php?u=" + u;
  var li = "https://www.linkedin.com/sharing/share-offsite/?url=" + u;
  var tw = "https://twitter.com/intent/tweet?url=" + u + "&text=" + tt;
  var wa = "https://wa.me/?text=" + encodeURIComponent(title + " " + url);
  var ml = "mailto:?subject=" + tt + "&body=" + encodeURIComponent(desc + "\n\n" + url);

  var XT = "<svg viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M18.244 2H21.5l-7.5 8.57L22.5 22h-6.9l-4.79-6.26L5.3 22H2l8.02-9.17L1.5 2h7.07l4.33 5.72L18.244 2Zm-1.21 18h1.9L7.05 4H5.02l12.013 16Z'/></svg>";
  var WA = "<svg viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M20 3.9A10 10 0 0 0 3.6 15.8L2 22l6.3-1.6A10 10 0 1 0 20 3.9ZM12 19.9a8.3 8.3 0 0 1-4.2-1.2l-.3-.2-3.7 1 1-3.6-.2-.3A8.3 8.3 0 1 1 12 19.9Zm4.6-6.2c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06a6.8 6.8 0 0 1-2-1.24 7.5 7.5 0 0 1-1.38-1.72c-.15-.25 0-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.02 2.59.13.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z'/></svg>";
  var ML = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' aria-hidden='true'><rect x='3' y='5' width='18' height='14' rx='2'/><path d='m3 7 9 6 9-6' stroke-linecap='round' stroke-linejoin='round'/></svg>";

  var FB = "<svg viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M13 22v-8h2.7l.4-3H13V9.1c0-.86.24-1.45 1.5-1.45H16V5.06C15.67 5.02 14.76 4.94 13.7 4.94c-2.2 0-3.7 1.34-3.7 3.8V11H7.5v3H10v8z'/></svg>";
  var LI = "<svg viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H21v-5.4c0-1.3-.03-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21H13z'/></svg>";
  var CP = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' aria-hidden='true'><path d='M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1' stroke-linecap='round'/><path d='M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1' stroke-linecap='round'/></svg>";

  var box = document.createElement("div");
  box.className = "share";
  box.innerHTML =
    "<span class='share-label'>Partager cet article</span>" +
    "<a class='share-btn share-fb' target='_blank' rel='noopener' aria-label='Partager sur Facebook' href='" + fb + "'>" + FB + "<span>Facebook</span></a>" +
    "<a class='share-btn share-li' target='_blank' rel='noopener' aria-label='Partager sur LinkedIn' href='" + li + "'>" + LI + "<span>LinkedIn</span></a>" +
    "<a class='share-btn share-x' target='_blank' rel='noopener' aria-label='Partager sur X' href='" + tw + "'>" + XT + "<span>X</span></a>" +
    "<a class='share-btn share-wa' target='_blank' rel='noopener' aria-label='Partager sur WhatsApp' href='" + wa + "'>" + WA + "<span>WhatsApp</span></a>" +
    "<a class='share-btn share-ml' aria-label='Partager par e-mail' href='" + ml + "'>" + ML + "<span>E-mail</span></a>" +
    "<button type='button' class='share-btn share-copy' aria-label='Copier le lien'>" + CP + "<span>Copier le lien</span></button>";
  art.appendChild(box);

  var copyBtn = box.querySelector(".share-copy");
  copyBtn.addEventListener("click", function () {
    var label = copyBtn.querySelector("span");
    var reset = function () {
      var old = "Copier le lien";
      label.textContent = "Lien copié !";
      setTimeout(function () { label.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(reset, reset);
    } else {
      var ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); reset();
    }
  });
})();
