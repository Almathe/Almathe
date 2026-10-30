# Moteur de contenu — Almathe & Associés

## Architecture

```
content-engine/
├── topics.json              # File d'attente des sujets (65+ topics, 12 clusters)
├── article-template.html    # Template HTML réutilisable
├── publish-article.ps1      # Script de mise à jour (sitemap, index, llms.txt)
├── daily-runner.md          # Documentation d'exécution
└── README.md                # Ce fichier
```

Agent : `.claude/agents/article-generator.md`

## Pipeline

```
1. topics.json (sujet pending)
   ↓
2. WebSearch (recherche internet + sources officielles SGG/DGID)
   ↓
3. Génération article HTML (template + contenu SEO)
   ↓
4. Publication (ressources/{slug}.html)
   ↓
5. Mise à jour site (sitemap.xml, ressources/index.html, llms.txt)
   ↓
6. topics.json (statut → published)
```

## Exécution

### Manuelle (un article)
Invoquer l'agent `article-generator` avec le slug du sujet souhaité.

### Automatique (1 article/jour)
- Cron configuré à 9h17 chaque matin (session-only, 7 jours max)
- Pour une automation permanente : utiliser `/loop` dans Claude Code

### Canva (visuels)
Le plugin Canva nécessite une authentification OAuth.
→ Autoriser via les paramètres de connecteurs Claude.ai.
En attendant : l'image OG par défaut (portrait.jpg) est utilisée.

## Clusters de contenu

| Cluster | Topics | Pillar existant |
|---------|--------|-----------------|
| Fiscalité générale | 8 | fiscalite-entreprises-congo-2026 |
| TVA Congo | 6 | teledeclarer-tva-congo-etapes |
| Impôt sur les sociétés | 4 | impot-societes-is-congo-2026 |
| ITS & salaires | 5 | impot-traitements-salaires-its-congo |
| SFEC & facture élec. | 3 | sfec-facture-electronique-congo |
| Création entreprise | 6 | creer-entreprise-congo-brazzaville-acpce |
| OHADA & SYSCOHADA | 5 | (nouveau pillar) |
| Contrôle fiscal | 3 | (nouveau pillar) |
| E-TAX & digital | 3 | e-tax-declaration-paiement-impots-congo |
| Fiscalité sectorielle | 5 | — |
| Lois de finances | 3 | loi-finances-2026-congo-mesures-fiscales |
| Droit OHADA | 3 | — |
| Pilotage financier | 3 | outil-pilotage-tresorerie-pme |
