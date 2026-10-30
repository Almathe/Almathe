(function () {
  "use strict";

  var listEl = document.querySelector("[data-jo-list]");
  var statusEl = document.querySelector("[data-jo-status]");
  var updatedEl = document.querySelector("[data-jo-updated]");

  if (!listEl || !statusEl) return;

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle("jo-error", !!isError);
  }

  function formatDateIso(isoDate) {
    try {
      var d = new Date(isoDate);
      if (Number.isNaN(d.getTime())) return "";
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch (e) {
      return "";
    }
  }

  function renderItems(items) {
    listEl.innerHTML = "";

    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "jo-item";

      var a = document.createElement("a");
      a.className = "jo-link";
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = item.title || "Journal officiel";

      li.appendChild(a);

      if (item.date || item.numero) {
        var meta = document.createElement("p");
        meta.className = "jo-meta";
        var chunks = [];
        if (item.numero) chunks.push("Numero " + item.numero);
        if (item.date) chunks.push("Date " + item.date);
        meta.textContent = chunks.join(" | ");
        li.appendChild(meta);
      }

      listEl.appendChild(li);
    });
  }

  setStatus("Chargement des 10 derniers numeros du Journal officiel...", false);

  fetch("../api/journal-officiel.php", { method: "GET" })
    .then(function (res) {
      if (!res.ok) throw new Error("Erreur HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.items) || !data.items.length) {
        throw new Error("Aucune donnee disponible.");
      }

      renderItems(data.items.slice(0, 10));
      setStatus("Derniere mise a jour automatique reussie.", false);

      if (updatedEl && data.fetchedAt) {
        var f = formatDateIso(data.fetchedAt);
        updatedEl.textContent = f ? ("Actualise le " + f) : "";
      }
    })
    .catch(function (err) {
      listEl.innerHTML = "";
      setStatus("Impossible de charger les mises a jour en direct. Consultez la source officielle ci-dessous.", true);
      if (updatedEl) updatedEl.textContent = "";
      console.error(err);
    });
})();
