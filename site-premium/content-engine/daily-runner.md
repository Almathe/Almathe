# Daily Content Engine Runner

## How to run manually

To generate one article, spawn the `article-generator` agent with a prompt like:

```
Generate the next pending article from the topic queue.

1. Read `C:\Almathe\site-premium\content-engine\topics.json`
2. Find the first topic with `"status": "pending"` — prefer "quick-win" priority topics first
3. Follow the full pipeline in your instructions (research → write → SEO → publish → update site files)
4. Working directory: C:\Almathe\site-premium
```

## How to run daily (automated)

Use `/loop` in Claude Code with the prompt:

```
Generate one article from the content engine topic queue at C:\Almathe\site-premium\content-engine\topics.json. Pick the first pending quick-win topic. Follow the article-generator agent instructions to research, write, and publish the article. After publishing, update sitemap.xml, ressources/index.html, llms.txt, and mark the topic as published in topics.json.
```

Or set up a CronCreate schedule (see below).

## Canva Visual Generation

The Canva plugin (`plugin:canva:canva`) requires OAuth authentication.
To enable visual generation:
1. Go to your Claude.ai connector settings
2. Authorize the Canva connector
3. Once authorized, the article-generator agent can create article header images

**Workaround without Canva**: Use the existing `portrait.jpg` as the OG image (already configured in the template). For custom visuals, manually create images in Canva using the brand colors (navy #0F172A, gold #C8A24A) and upload them to `assets/images/`.

## Topic Queue Stats

- Total topics: 65+
- Clusters: 12 (fiscalité générale, TVA, IS, ITS/salaires, SFEC, création entreprise, OHADA/SYSCOHADA, contrôle fiscal, E-TAX, sectorielle, lois de finances, droit OHADA, pilotage financier)
- Quick-wins: ~40 topics (low competition, high business value)
- Big bets: ~8 topics (comprehensive pillar content)
- Fill-ins: ~17 topics (batch producible)
- At 1 article/day: ~2+ months of content planned
