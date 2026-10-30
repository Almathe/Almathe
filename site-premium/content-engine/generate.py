"""
Almathe Content Engine — Daily Article Generator
Uses Google Gemini (free tier) + DuckDuckGo for research.
Reads topics.json, generates one article, updates all site files.
"""
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

import google.generativeai as genai
from duckduckgo_search import DDGS

SITE_ROOT = Path(__file__).resolve().parent.parent
ENGINE_DIR = SITE_ROOT / "content-engine"
RESSOURCES_DIR = SITE_ROOT / "ressources"
TEMPLATE_PATH = ENGINE_DIR / "article-template.html"
TOPICS_PATH = ENGINE_DIR / "topics.json"
SITEMAP_PATH = SITE_ROOT / "sitemap.xml"
INDEX_PATH = RESSOURCES_DIR / "index.html"
LLMS_PATH = SITE_ROOT / "llms.txt"

TODAY = datetime.now().strftime("%Y-%m-%d")
MAX_SOURCE_AGE_DAYS = 30


def load_topics():
    with open(TOPICS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_topics(data):
    with open(TOPICS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def pick_next_topic(data):
    for priority in ["quick-win", "big-bet", "fill-in"]:
        for cluster in data["clusters"]:
            for topic in cluster["topics"]:
                if topic["status"] == "pending" and topic["priority"] == priority:
                    return cluster, topic
    return None, None


def get_published_titles(data):
    titles = []
    for cluster in data["clusters"]:
        for topic in cluster["topics"]:
            if topic["status"] == "published":
                titles.append(topic["title"])
    return titles


def generate_new_topic(data):
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel("gemini-2.0-flash")

    published = get_published_titles(data)
    published_list = "\n".join(f"- {t}" for t in published) if published else "(aucun)"

    cluster_names = [c["name"] for c in data["clusters"]]
    clusters_list = "\n".join(f"- {n}" for n in cluster_names)

    prompt = f"""Tu es stratège de contenu pour le cabinet de consulting Almathe & Associés (https://almathe.net), spécialisé en fiscalité, finance et conseil aux entreprises au Congo-Brazzaville et en France.

ARTICLES DÉJÀ PUBLIÉS (ne PAS répéter ces sujets) :
{published_list}

CLUSTERS THÉMATIQUES EXISTANTS :
{clusters_list}

RÈGLES :
- Le sujet doit concerner la fiscalité, la comptabilité, le droit des affaires ou la finance d'entreprise au Congo-Brazzaville
- Privilégie les sujets pratiques recherchés par les dirigeants de PME/TPE
- Le mot-clé doit être en français, longue traîne, facile à ranker (peu de concurrence)
- Ne JAMAIS proposer un sujet déjà couvert dans la liste ci-dessus
- Le sujet peut appartenir à un cluster existant ou en créer un nouveau

Propose UN nouveau sujet. Renvoie UNIQUEMENT un objet JSON valide :
{{
  "cluster_id": "id-du-cluster-existant-ou-nouveau",
  "cluster_name": "Nom du cluster",
  "slug": "slug-url-en-kebab-case",
  "title": "Titre SEO complet",
  "keyword": "mot-clé principal longue traîne",
  "intent": "informational|commercial",
  "priority": "quick-win",
  "description": "Ce que l'article couvre (1-2 phrases)",
  "wordTarget": 1300,
  "faq": ["Question FAQ 1 ?", "Question FAQ 2 ?"],
  "internalLinks": ["article-existant-pertinent.html"]
}}

Renvoie UNIQUEMENT le JSON, sans ```json ni texte autour."""

    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def inject_topic(data, new_topic):
    cluster_id = new_topic.pop("cluster_id", "auto-generated")
    cluster_name = new_topic.pop("cluster_name", "Sujets auto-générés")
    new_topic["status"] = "pending"

    target_cluster = None
    for cluster in data["clusters"]:
        if cluster["id"] == cluster_id:
            target_cluster = cluster
            break

    if target_cluster is None:
        target_cluster = {
            "id": cluster_id,
            "name": cluster_name,
            "pillar": None,
            "topics": [],
        }
        data["clusters"].append(target_cluster)

    target_cluster["topics"].append(new_topic)
    return target_cluster, new_topic


def search_topic(keyword, num_results=8):
    results = []
    with DDGS() as ddgs:
        for query in [
            f"{keyword} Congo-Brazzaville",
            f"{keyword} DGID CGI",
            f"{keyword} loi de finances Congo",
        ]:
            try:
                hits = list(ddgs.text(query, region="fr-fr", max_results=num_results))
                results.extend(hits)
            except Exception:
                continue
    seen = set()
    unique = []
    for r in results:
        url = r.get("href", "")
        if url not in seen:
            seen.add(url)
            unique.append(r)
    return unique[:15]


def filter_fresh_sources(results):
    fresh = []
    cutoff = datetime.now() - timedelta(days=MAX_SOURCE_AGE_DAYS)
    official_patterns = re.compile(
        r"(sgg\.cg|dgid|gouv\.cg|journal.officiel|ohada\.com|legicongo)", re.I
    )
    for r in results:
        if official_patterns.search(r.get("href", "")):
            fresh.append(r)
            continue
        body = r.get("body", "")
        date_match = re.search(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})", body)
        if date_match:
            try:
                d, m, y = date_match.groups()
                source_date = datetime(int(y), int(m), int(d))
                if source_date >= cutoff:
                    fresh.append(r)
            except ValueError:
                fresh.append(r)
        else:
            fresh.append(r)
    return fresh


def build_research_context(results):
    lines = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "Sans titre")
        body = r.get("body", "")
        href = r.get("href", "")
        lines.append(f"[Source {i}] {title}\nURL: {href}\n{body}\n")
    return "\n".join(lines)


def build_internal_links_context(topic):
    links = topic.get("internalLinks", [])
    if not links:
        return "Aucun lien interne spécifié."
    return "\n".join(f"- {link}" for link in links)


def generate_article_content(topic, cluster, research_context):
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel("gemini-2.0-flash")

    faq_items = topic.get("faq", [])
    faq_instruction = ""
    if faq_items:
        faq_instruction = (
            "Inclus une section FAQ à la fin avec ces questions :\n"
            + "\n".join(f"- {q}" for q in faq_items)
        )

    prompt = f"""Tu es rédacteur expert en fiscalité congolaise pour le cabinet de consulting Almathe & Associés (https://almathe.net).

RÈGLES ABSOLUES :
- Ne JAMAIS décrire Almathe comme "expert-comptable" — il est consultant en stratégie et finance d'entreprise
- Le cabinet est un "cabinet de consulting", PAS un cabinet d'expertise comptable
- Écrire en français professionnel mais accessible, sans jargon non expliqué
- Citer les sources légales précises (articles du CGI, lois de finances, numéros de textes)
- Les sources de recherche ci-dessous datent de moins de 30 jours sauf textes officiels

SUJET : {topic['title']}
MOT-CLÉ PRINCIPAL : {topic['keyword']}
DESCRIPTION : {topic['description']}
NOMBRE DE MOTS CIBLE : {topic['wordTarget']}
CLUSTER : {cluster['name']}

LIENS INTERNES À INCLURE NATURELLEMENT (sous forme <a href="FICHIER">texte</a>) :
{build_internal_links_context(topic)}

{faq_instruction}

RECHERCHE (sources récentes) :
{research_context}

CONSIGNES DE RÉDACTION :
1. Commence par un paragraphe d'introduction contenant naturellement le mot-clé principal
2. Ajoute un paragraphe de cross-référence vers les articles existants du site (liens internes)
3. Structure en sections H2 numérotées couvrant le sujet de manière exhaustive
4. Utilise des tableaux, listes à puces et exemples pratiques
5. Termine par une section FAQ si des questions sont fournies
6. Termine par un CTA : <p style="margin-top:2rem"><strong>Besoin d'un accompagnement ?</strong> <a href="../contact.html">Contactez Almathe &amp; Associés</a> pour un diagnostic personnalisé.</p>

FORMAT DE SORTIE — renvoie UNIQUEMENT un objet JSON valide avec ces clés :
{{
  "meta_description": "... (max 155 caractères, avec le mot-clé)",
  "og_title": "... (max 70 caractères)",
  "og_description": "... (max 200 caractères)",
  "headline": "... (titre JSON-LD)",
  "schema_description": "... (description JSON-LD)",
  "breadcrumb_name": "... (court, pour le fil d'ariane)",
  "eyebrow": "... (ex: Congo · Fiscalité)",
  "h1": "... (titre H1 de l'article)",
  "lead": "... (1-2 phrases d'accroche)",
  "article_body": "... (le contenu HTML complet de l'article, avec balises h2, p, ul, table, etc.)",
  "faq_schema": [
    {{"question": "...", "answer": "..."}}
  ]
}}

Renvoie UNIQUEMENT le JSON, sans ```json ni texte autour."""

    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def build_faq_schema(faq_items):
    if not faq_items:
        return ""
    entries = []
    for item in faq_items:
        q = item["question"].replace('"', "&quot;")
        a = item["answer"].replace('"', "&quot;")
        entries.append(
            f'{{\n            "@type": "Question",\n'
            f'            "name": "{q}",\n'
            f'            "acceptedAnswer": {{ "@type": "Answer", "text": "{a}" }}\n'
            f"          }}"
        )
    return (
        ',\n      {\n        "@type": "FAQPage",\n'
        '        "mainEntity": [\n          '
        + ",\n          ".join(entries)
        + "\n        ]\n      }"
    )


def fill_template(template, topic, content):
    faq_schema = build_faq_schema(content.get("faq_schema", []))

    replacements = {
        "{{TITLE}}": topic["title"],
        "{{META_DESCRIPTION}}": content["meta_description"],
        "{{SLUG}}": topic["slug"],
        "{{OG_TITLE}}": content["og_title"],
        "{{OG_DESCRIPTION}}": content["og_description"],
        "{{TWITTER_DESCRIPTION}}": content["og_description"],
        "{{HEADLINE}}": content["headline"],
        "{{SCHEMA_DESCRIPTION}}": content["schema_description"],
        "{{DATE_PUBLISHED}}": TODAY,
        "{{DATE_MODIFIED}}": TODAY,
        "{{BREADCRUMB_NAME}}": content["breadcrumb_name"],
        "{{EYEBROW}}": content["eyebrow"],
        "{{H1}}": content["h1"],
        "{{LEAD}}": content["lead"],
        "{{ARTICLE_BODY}}": content["article_body"],
        "{{FAQ_SCHEMA}}": faq_schema,
    }
    html = template
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)
    return html


def update_sitemap(slug):
    url = f"https://almathe.net/ressources/{slug}.html"
    content = SITEMAP_PATH.read_text(encoding="utf-8")
    if url in content:
        return
    entry = (
        f"\n  <url>\n"
        f"    <loc>{url}</loc>\n"
        f"    <lastmod>{TODAY}</lastmod>\n"
        f"    <changefreq>monthly</changefreq>\n"
        f"    <priority>0.7</priority>\n"
        f"  </url>"
    )
    content = content.replace("</urlset>", f"{entry}\n</urlset>")
    SITEMAP_PATH.write_text(content, encoding="utf-8")


def update_index(slug, title, eyebrow, description):
    content = INDEX_PATH.read_text(encoding="utf-8")
    if f"{slug}.html" in content:
        return
    card = (
        f'\n        <article class="card" data-reveal>\n'
        f'          <span class="eyebrow">{eyebrow}</span>\n'
        f'          <h3 style="margin-top:.5rem"><a href="{slug}.html">{title}</a></h3>\n'
        f"          <p>{description}</p>\n"
        f'          <p style="margin-top:1rem"><a class="btn btn-ghost" href="{slug}.html">Lire l\'article &#x2192;</a></p>\n'
        f"        </article>\n"
    )
    content = content.replace(
        '<div class="grid cards">', f'<div class="grid cards">{card}'
    )
    INDEX_PATH.write_text(content, encoding="utf-8")


def update_llms(slug, title):
    url = f"https://almathe.net/ressources/{slug}.html"
    content = LLMS_PATH.read_text(encoding="utf-8")
    if url in content:
        return
    section = "## Ressources · Fiscalité au Congo"
    entry = f"- [{title}]({url})"
    if section in content:
        content = content.replace(section, f"{section}\n{entry}")
    else:
        content += f"\n{entry}"
    LLMS_PATH.write_text(content, encoding="utf-8")


def mark_published(data, slug):
    for cluster in data["clusters"]:
        for topic in cluster["topics"]:
            if topic["slug"] == slug:
                topic["status"] = "published"
                topic["publishedDate"] = TODAY
                return


def main():
    data = load_topics()
    cluster, topic = pick_next_topic(data)
    if topic is None:
        print("File d'attente vide — génération automatique d'un nouveau sujet...")
        new_topic = generate_new_topic(data)
        cluster, topic = inject_topic(data, new_topic)
        save_topics(data)
        print(f"Nouveau sujet créé : {topic['title']}")

    slug = topic["slug"]
    print(f"Sujet sélectionné : {topic['title']} [{slug}]")

    print("Recherche en cours...")
    raw_results = search_topic(topic["keyword"])
    results = filter_fresh_sources(raw_results)
    print(f"  {len(results)} sources retenues (sur {len(raw_results)} trouvées)")
    research_context = build_research_context(results)

    print("Génération de l'article via Gemini...")
    content = generate_article_content(topic, cluster, research_context)

    print("Remplissage du template...")
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    html = fill_template(template, topic, content)

    article_path = RESSOURCES_DIR / f"{slug}.html"
    article_path.write_text(html, encoding="utf-8")
    print(f"Article écrit : {article_path}")

    word_count = len(re.findall(r"\w+", content.get("article_body", "")))
    print(f"Nombre de mots : ~{word_count}")

    print("Mise à jour du sitemap...")
    update_sitemap(slug)

    print("Mise à jour de ressources/index.html...")
    update_index(slug, topic["title"], content["eyebrow"], topic["description"])

    print("Mise à jour de llms.txt...")
    update_llms(slug, topic["title"])

    print("Mise à jour de topics.json...")
    mark_published(data, slug)
    save_topics(data)

    print(f"\n[OK] Article publié : https://almathe.net/ressources/{slug}.html")
    print(f"     Mot-clé : {topic['keyword']}")
    print(f"     Mots : ~{word_count}")


if __name__ == "__main__":
    main()
