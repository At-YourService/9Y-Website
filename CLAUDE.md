# 9Yards Website — Claude Code Routines

This file defines routines for Claude Code to assist with content management on the 9Yards website.

---

## Content file convention (applies to ALL content types)

Every piece of content — news posts and job postings — is a single English Markdown file.

### Filename pattern

```
DD_MM_YYYY_slug.md
```

### Rules
- Files are saved in the relevant folder (`/news/` or `/jobs/`)
- Use today's date for news posts; use the posting date for jobs
- After saving a content file, **always update the folder's `manifest.json`** — the site will not display the new content otherwise

---

## Manifest format

Both `/news/manifest.json` and `/jobs/manifest.json` follow this structure:

```json
[
    {
        "id": "DD_MM_YYYY_slug",
        "title": "Post or job title",
        "date": "YYYY-MM-DD",
        "category": "Category",
        "excerpt": "One or two sentence teaser.",
        "file": "DD_MM_YYYY_slug.md"
    }
]
```

**Rules:**
- Prepend new entries at the top of the array (newest first)
- `id` and `file` share the same slug — only `file` has the `.md` extension
- `date` is ISO format (`YYYY-MM-DD`), `id`/`file` use `DD_MM_YYYY`
- `excerpt` must match the frontmatter `excerpt` field exactly

---

## Routine: New News Post

**Trigger:** When asked to create, write, or add a new news post or article.

### What to do

1. **Ask for the topic or title** if not already provided.
2. **Scan existing posts** in `/news/` to:
   - Identify all categories already in use (from `manifest.json`)
   - Match the writing tone and post length
3. **Generate the post** following the rules below.
4. **Save the file** to `/news/DD_MM_YYYY_slug.md`
5. **Update `/news/manifest.json`** — prepend a new entry.
6. **Confirm** by listing the file path and manifest update, with a one-line post summary.

---

### Frontmatter format

```yaml
---
title: <Post title, sentence case>
category: <Single category — match an existing one from manifest.json if possible>
excerpt: <One or two sentences, enticing and punchy>
---
```

**Rules:**
- `title`: Sentence case, no trailing period, max ~10 words
- `category`: Reuse an existing category (e.g. `Transformation`, `AI & Data`, `Methodology`). If none fit, propose one and confirm with the user.
- `excerpt`: Max 2 sentences. Should make the reader want to click. Must match the manifest entry exactly.

---

### Post body format

```markdown
# <Same as frontmatter title>

<Opening paragraph — 2-3 sentences, sets context>

## <Section heading>

<Body content>

## <Section heading>

<Body content>

---

*Want to know more? [Contact us](https://9yards.be/#contact).*
```

**Rules:**
- Tone: Clear, pragmatic, forward-looking — 9Yards speaks like a knowledgeable colleague, not a brochure
- Length: 200–400 words for news posts; 400–700 words for insight/opinion posts
- Always end with a CTA linking to `https://9yards.be/#contact`
- Use `##` for section headings, `###` for sub-sections only when necessary
- Prefer flowing prose over bullet-heavy lists

---

### SEO metadata (add as HTML comment at bottom of file)

```html
<!--
seo_title: <Title tag — max 60 chars, include "9Yards">
seo_description: <Meta description — max 155 chars>
seo_keywords: <Comma-separated, 4-6 keywords relevant to the post>
-->
```

---

### Category suggestions

After scanning `/news/manifest.json`, suggest 2–3 relevant categories based on existing ones and the post topic. Present suggestions before saving.

---

### Example invocations

```bash
claude "write a new news post about enterprise AI adoption trends"
claude "write an Insights post about IT architecture for sustainable growth"
```

### Example output file

**`/news/22_05_2026_ai_adoption_playbook.md`**
```markdown
---
title: The enterprise AI adoption playbook
category: AI & Data
excerpt: Most AI pilots never reach production. Here is why — and how 9Yards helps organisations close the gap.
---

# The enterprise AI adoption playbook

AI adoption is accelerating, but the gap between pilot and production remains stubbornly wide. Many organisations invest in promising proof-of-concepts only to see them stall before delivering value...

## Why pilots fail to scale

The most common failure mode is not technical — it is organisational. Pilots are treated as experiments rather than business initiatives, so success criteria are vague and stakeholder buy-in is shallow.

## The 9Yards approach

We embed feasibility and financial viability from day one. Before a single line of code is written, we align on what "done" looks like and what it needs to return...

---

*Want to know more? [Contact us](https://9yards.be/#contact).*

<!--
seo_title: Enterprise AI adoption playbook — 9Yards
seo_description: Why most AI pilots fail to reach production — and how 9Yards helps organisations bridge the gap from pilot to scale.
seo_keywords: AI adoption, enterprise AI, digital transformation, 9Yards, Belgium
-->
```

**Corresponding manifest entry (prepended to `/news/manifest.json`):**
```json
{
    "id": "22_05_2026_ai_adoption_playbook",
    "title": "The enterprise AI adoption playbook",
    "date": "2026-05-22",
    "category": "AI & Data",
    "excerpt": "Most AI pilots never reach production. Here is why — and how 9Yards helps organisations close the gap.",
    "file": "22_05_2026_ai_adoption_playbook.md"
}
```

---

## Routine: New Job Posting

**Trigger:** When asked to create, write, or add a new job posting or vacancy.

### What to do

1. **Ask for job details** if not already provided (minimum: job title, role description, requirements).
2. **Scan existing jobs** in `/jobs/` to match tone and avoid duplicate slugs.
3. **Generate the posting** following the rules below.
4. **Save the file** to `/jobs/DD_MM_YYYY_slug.md`
5. **Update `/jobs/manifest.json`** — prepend a new entry.
6. **Confirm** by listing the file path, manifest update, and a one-line role summary.

---

### Frontmatter format

```yaml
---
title: <Job title>
excerpt: <One or two punchy sentences. Lead with impact — what will this person build or achieve?>
image: images/<slug>.jpg
---
```

**Rules:**
- `title`: Clear job title, no trailing period
- `excerpt`: Max 2 sentences. Must match the manifest entry exactly.
- `image`: Remind the user to add the image manually after saving.

---

### Job body format

```markdown
# <Same as frontmatter title>

![<Job title>](<image url>)

<Opening paragraph — 2-3 sentences. What is 9Yards, what is the mission, why this role exists now.>

## What You'll Do

### <Responsibility area 1>

- <Task>
- <Task>
- <Task>

### <Responsibility area 2>

- <Task>
- <Task>

## Who You Are

- <Requirement>
- <Requirement>
- <Requirement>

Bonus points if you:

- <Nice to have>
- <Nice to have>

## What We Offer

- <Benefit>
- <Benefit>
- <Benefit>
```

**Rules:**
- Tone: Direct, energetic, and human. 9Yards is a scale-up — avoid stiff HR language. Speak to builders and doers.
- Length: 300–600 words
- Use `##` for main sections, `###` for sub-areas within responsibilities
- Bullet points are the norm for tasks, requirements, and benefits
- Do **not** include salary figures unless the user explicitly provides them

---

### Required details to collect

| Field | Required | Ask if missing |
|-------|----------|----------------|
| Job title | ✅ | Yes |
| Role description / responsibilities | ✅ | Yes — or generate based on title |
| Requirements / profile | ✅ | Yes — or generate based on title |
| What 9Yards offers | ❌ | Use standard benefits below if not provided |
| Image filename | ❌ | Default to `images/<slug>.jpg` |

---

### Standard benefits (use if not specified by user)

- A challenging role in a fast-growing consultancy
- Cross-industry projects with a strong technology dimension
- Personal coach and tailored growth plan
- Competitive salary package including a car and the usual fringe benefits
- 9Yards team spirit: knowledge-sharing events, yearly team weekend, afterwork drinks

---

### SEO metadata

```html
<!--
seo_title: <Job title + "— 9Yards" — max 60 chars>
seo_description: <Max 155 chars, mention the role and 9Yards mission>
seo_keywords: <4-6 keywords: job title, architecture, Belgium, consultancy, hiring>
-->
```

---

### Image reminder

After saving the file and updating the manifest, remind the user:

> **Don't forget:** Add a job image at `/jobs/images/<slug>.jpg` — referenced in the job frontmatter.

---

### Example invocations

```bash
claude "add a new job posting for a Data Architect"
claude "add a new vacancy: Change Manager, focus on digital transformation programs"
```

### Example output file

**`/jobs/22_05_2026_data_architect.md`**
```markdown
---
title: Data Architect
excerpt: Design the data foundations that power intelligent organisations. Join 9Yards and shape the way our clients turn data into decisions.
image: images/data_architect.jpg
---

# Data Architect

![Data Architect](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2426)

Nine Yards helps organisations design business and digital solutions that last. As a Data Architect, you will define the data strategies and platforms that make our clients' transformation programmes real and measurable.

## What You'll Do

### Data strategy and architecture

- Design end-to-end data architectures aligned to business objectives.
- Define data governance frameworks and ownership models.
- Advise clients on platform selection (data lakes, warehouses, lakehouses).

### Delivery and enablement

- Lead data workstreams within broader transformation programmes.
- Translate business requirements into technical data models.
- Mentor client teams on data engineering best practices.

## Who You Are

- 5+ years of experience in data architecture or data engineering.
- Strong knowledge of cloud data platforms (Azure, AWS, GCP).
- Experience with ERP, CRM, or enterprise application data integration.
- Comfortable facilitating workshops with both business and technical stakeholders.
- Fluent in English; Dutch or French is a strong plus.

Bonus points if you:

- Hold a TOGAF, Zachman, or equivalent architecture certification.
- Have hands-on experience with AI/ML data pipelines.

## What We Offer

- A challenging role in a fast-growing consultancy.
- Cross-industry projects with a strong technology dimension.
- Personal coach and tailored growth plan.
- Competitive salary package including a car and the usual fringe benefits.
- 9Yards team spirit: knowledge-sharing events, yearly team weekend, afterwork drinks.

<!--
seo_title: Data Architect — 9Yards
seo_description: 9Yards is hiring a Data Architect to design data strategies and platforms for enterprise transformation programmes in Belgium.
seo_keywords: data architect, data strategy, digital transformation, 9Yards, Belgium, vacancy
-->
```

**Corresponding manifest entry (prepended to `/jobs/manifest.json`):**
```json
{
    "id": "22_05_2026_data_architect",
    "title": "Data Architect",
    "date": "2026-05-22",
    "category": "Architecture",
    "excerpt": "Design the data foundations that power intelligent organisations. Join 9Yards and shape the way our clients turn data into decisions.",
    "file": "22_05_2026_data_architect.md"
}
```

---

## Brand voice reminder

**9Yards** (Nine Yards) is a Belgian business and digital solution design consultancy.
- **Tagline:** *Business & Digital Solution Design*
- **Positioning:** *We empower the projects of today & design the organizations of tomorrow*
- **Services:** Business Process Optimization, AI transformation roadmaps, Application Portfolio Modernization, Technology Selection Advisory, IT Architecture Solutions
- **Tone:** Professional but human. Pragmatic, clear, forward-looking. Speak like a knowledgeable colleague — never like a corporate brochure.
- **Audience:** Business and IT leaders in Belgian and Benelux organisations
- **Language:** English only — one file per piece of content
- **Contact:** info@9Yards.be | https://9yards.be
