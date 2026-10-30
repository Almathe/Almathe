(function () {
  "use strict";

  var dataUrl = "api/entreprises-acpce.php";
  var listRoot = document.querySelector("[data-annuaire-list]");
  var searchInput = document.querySelector("[data-annuaire-search]");
  var countEl = document.querySelector("[data-annuaire-count]");
  var emptyEl = document.querySelector("[data-annuaire-empty]");
  var alphabetBar = document.querySelector("[data-annuaire-alphabet]");
  var params = new URLSearchParams(window.location.search);
  var initialTerm = params.get("q") || "";

  if (!listRoot) return;

  var allCompanies = [];

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function firstLetter(name) {
    var clean = normalize(name).toUpperCase();
    var letter = clean.charAt(0);
    if (!letter.match(/[A-Z]/)) return "#";
    return letter;
  }

  function compareByName(a, b) {
    return String(a.denomination || "").localeCompare(String(b.denomination || ""), "fr", {
      sensitivity: "base"
    });
  }

  function byAlphabet(companies) {
    var groups = {};
    companies.forEach(function (item) {
      var letter = firstLetter(item.denomination);
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(item);
    });

    Object.keys(groups).forEach(function (key) {
      groups[key].sort(compareByName);
    });

    return groups;
  }

  function buildAlphabetLinks(groups) {
    if (!alphabetBar) return;
    alphabetBar.innerHTML = "";

    var letters = Object.keys(groups).sort();
    letters.forEach(function (letter) {
      var link = document.createElement("a");
      link.className = "annuaire-letter-link";
      link.href = "#letter-" + encodeURIComponent(letter);
      link.textContent = letter;
      alphabetBar.appendChild(link);
    });
  }

  function cardCompany(company) {
    var item = document.createElement("li");
    item.className = "annuaire-item";

    var anchor = document.createElement("a");
    anchor.className = "annuaire-item-link";
    anchor.href = "entreprise.html?code=" + encodeURIComponent(company.code || "");

    var name = document.createElement("h3");
    name.className = "annuaire-item-name";
    name.textContent = company.denomination || "Entreprise sans nom";

    var meta = document.createElement("p");
    meta.className = "annuaire-item-meta";
    meta.textContent = [company.formeJuridique, company.rccm].filter(Boolean).join(" · ");

    var activity = document.createElement("p");
    activity.className = "annuaire-item-activity";
    activity.textContent = company.activite || "Activité non renseignée";

    anchor.appendChild(name);
    anchor.appendChild(meta);
    anchor.appendChild(activity);
    item.appendChild(anchor);

    return item;
  }

  function render(companies) {
    listRoot.innerHTML = "";
    var groups = byAlphabet(companies);
    var letters = Object.keys(groups).sort();

    buildAlphabetLinks(groups);

    if (!letters.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (countEl) countEl.textContent = "0 entreprise";
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    letters.forEach(function (letter) {
      var section = document.createElement("section");
      section.className = "annuaire-group";
      section.id = "letter-" + letter;

      var title = document.createElement("h2");
      title.className = "annuaire-group-title";
      title.textContent = letter;

      var list = document.createElement("ul");
      list.className = "annuaire-group-list";

      groups[letter].forEach(function (company) {
        list.appendChild(cardCompany(company));
      });

      section.appendChild(title);
      section.appendChild(list);
      listRoot.appendChild(section);
    });

    var label = companies.length > 1 ? "entreprises" : "entreprise";
    if (countEl) countEl.textContent = companies.length + " " + label;
  }

  function filterAndRender() {
    var term = normalize(searchInput ? searchInput.value : "");
    if (!term) {
      render(allCompanies);
      return;
    }

    var filtered = allCompanies.filter(function (item) {
      var haystack = [
        item.denomination,
        item.formeJuridique,
        item.activite,
        item.adresse,
        item.rccm,
        item.codeActivite,
        item.nom,
        item.prenom
      ].map(normalize).join(" ");

      return haystack.indexOf(term) >= 0;
    });

    render(filtered);
  }

  fetch(dataUrl)
    .then(function (res) {
      if (!res.ok) throw new Error("Impossible de charger les donnees");
      return res.json();
    })
    .then(function (payload) {
      var rows = Array.isArray(payload) ? payload : (Array.isArray(payload.items) ? payload.items : []);
      allCompanies = rows.slice().sort(compareByName);
      if (searchInput && initialTerm) {
        searchInput.value = initialTerm;
      }

      if (initialTerm) {
        filterAndRender();
      } else {
        render(allCompanies);
      }

      if (searchInput) {
        searchInput.addEventListener("input", filterAndRender);
      }
    })
    .catch(function () {
      if (countEl) countEl.textContent = "0 entreprise";
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = "Impossible de charger l'annuaire pour le moment.";
      }
    });
})();
