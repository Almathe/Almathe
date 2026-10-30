(function () {
  "use strict";

  var dataUrl = "assets/data/entreprises-congo.json";
  var detailRoot = document.querySelector("[data-company-detail]");
  if (!detailRoot) return;

  var titleEl = document.querySelector("[data-company-title]");
  var subtitleEl = document.querySelector("[data-company-subtitle]");

  function setNotFound() {
    if (titleEl) titleEl.textContent = "Entreprise introuvable";
    if (subtitleEl) {
      subtitleEl.textContent = "Le code transmis ne correspond a aucune entreprise de l'annuaire.";
    }
    detailRoot.innerHTML = "<p class='company-not-found'>Verifiez le lien ou revenez a l'annuaire.</p>";
  }

  function addField(label, value) {
    if (!value) return;

    var row = document.createElement("div");
    row.className = "company-field";

    var dt = document.createElement("dt");
    dt.textContent = label;

    var dd = document.createElement("dd");
    dd.textContent = value;

    row.appendChild(dt);
    row.appendChild(dd);
    detailRoot.appendChild(row);
  }

  function renderCompany(company) {
    if (titleEl) titleEl.textContent = company.denomination || "Entreprise";
    if (subtitleEl) {
      subtitleEl.textContent = [company.formeJuridique, company.rccm].filter(Boolean).join(" · ");
    }

    detailRoot.innerHTML = "";
    addField("Code entreprise", company.code);
    addField("Forme juridique", company.formeJuridique);
    addField("Denomination", company.denomination);
    addField("Capital", company.capital);
    addField("Adresse", company.adresse);
    addField("Activite", company.activite);
    addField("Code activite", company.codeActivite);
    addField("Duree", company.duree);
    addField("RCCM", company.rccm);
    addField("Date RCCM", company.dateRccm);
    addField("Nom responsable", company.nom);
    addField("Prenom responsable", company.prenom);
    addField("Nationalite", company.nationalite);
    addField("Date de creation", company.dateCreation);
  }

  var params = new URLSearchParams(window.location.search);
  var code = params.get("code");

  if (!code) {
    setNotFound();
    return;
  }

  fetch(dataUrl)
    .then(function (res) {
      if (!res.ok) throw new Error("Erreur de chargement des donnees");
      return res.json();
    })
    .then(function (rows) {
      if (!Array.isArray(rows)) {
        setNotFound();
        return;
      }

      var found = rows.find(function (item) {
        return String(item.code || "") === String(code);
      });

      if (!found) {
        setNotFound();
        return;
      }

      renderCompany(found);
    })
    .catch(function () {
      setNotFound();
    });
})();
