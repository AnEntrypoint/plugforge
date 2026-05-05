---
name: pages
description: Scaffold and maintain a GitHub Pages site. Buildless in browser (webjsx + rippleui via CDN), flatspace for content aggregation built during GH Actions. Use when user wants to create or update a GH Pages site.
---

# Pages — GitHub Pages site scaffolder

Scaffold a complete GH Pages site with no local build step. Content via flatspace flat-file CMS, UI via webjsx + rippleui CDN, GH Actions builds and deploys. Follow the full chain: `planning → gm-execute → gm-emit → gm-complete → update-docs`.

## Stack

| Layer | Tool | How |
|---|---|---|
| UI rendering | [webjsx](https://webjsx.org) | ES module via importmap, `applyDiff` for DOM updates |
| Styling | [rippleui](https://ripple-ui.com) | CDN `<link>` — Tailwind-based component classes |
| Content CMS | [flatspace](https://npmjs.com/package/flatspace) | Aggregates `content/` → `docs/data/*.json` at build time |
| Build | GH Actions | `npx flatspace` runs in CI, commits output to `docs/` |
| Hosting | GitHub Pages | Source set to "GitHub Actions" |

## Layout

```
<project>/
  content/
    pages/
    posts/
    data/
  docs/
    index.html       # committed, never regenerated
    app.js           # committed
    data/            # flatspace output, gitignored
  .github/workflows/pages.yml
  flatspace.config.js
```

## index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{SITE_TITLE}}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/rippleui@1.12.1/dist/css/styles.css">
  <script type="importmap">
  {
    "imports": {
      "webjsx": "https://cdn.jsdelivr.net/npm/webjsx@0.0.42/dist/index.js",
      "webjsx/jsx-runtime": "https://cdn.jsdelivr.net/npm/webjsx@0.0.42/dist/jsx-runtime.js"
    }
  }
  </script>
  <script type="module" src="./app.js"></script>
</head>
<body class="bg-backgroundPrimary text-content1 min-h-screen">
  <div id="root"></div>
</body>
</html>
```

## app.js

```js
import { applyDiff } from 'webjsx';

const h = (tag, props, ...children) => ({ tag, props: props || {}, children });
const state = { page: null, data: {} };

async function loadData(path) { return (await fetch(path)).json(); }
function render() { applyDiff(document.getElementById('root'), App(state)); }

function App(s) {
  if (!s.page) return h('div', { class: 'flex justify-center p-8' }, h('span', { class: 'spinner' }));
  return h('div', { class: 'max-w-4xl mx-auto p-4' },
    h('nav', { class: 'navbar bg-backgroundSecondary mb-6' },
      h('span', { class: 'navbar-brand text-xl font-bold' }, s.page.title)
    ),
    h('main', {}, ...s.page.sections.map(Section))
  );
}

function Section(section) {
  return h('section', { class: 'card mb-4 p-6' },
    h('h2', { class: 'text-2xl font-bold mb-2' }, section.title),
    h('p', { class: 'text-content2' }, section.body)
  );
}

async function main() { state.page = await loadData('./data/index.json'); render(); }
main();
```

## flatspace.config.js

```js
module.exports = {
  input: './content',
  output: './docs/data',
  collections: {
    pages: { dir: 'pages', format: 'markdown' },
    posts: { dir: 'posts', format: 'markdown', sortBy: 'date', order: 'desc' },
    data: { dir: 'data', format: 'json' }
  }
};
```

## pages.yml

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Build content with flatspace
        run: npx flatspace
      - name: Commit built data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/data/
          git diff --staged --quiet || git commit -m "chore: build content [skip ci]"
          git push
      - uses: actions/upload-pages-artifact@v3
        with: { path: docs/ }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Scaffold sequence

Read existing `docs/` and `content/` if present — never clobber existing content. Create the directory structure. Write `docs/index.html`, `docs/app.js`, `flatspace.config.js`, `.github/workflows/pages.yml`, `content/pages/index.md` with minimal frontmatter (`title`, `sections` array). Add `docs/data/` to `.gitignore`. Verify GH Pages setting is "GitHub Actions" in repo Settings — remind the user if you can't verify.

## rippleui classes

| Component | Class |
|---|---|
| Button | `btn btn-primary`, `btn btn-secondary`, `btn btn-ghost` |
| Card | `card p-4` |
| Input | `input input-primary` |
| Navbar | `navbar` + `navbar-brand` |
| Badge | `badge badge-primary` |
| Alert | `alert alert-success`, `alert alert-error` |
| Spinner | `spinner` |
| Divider | `divider` |

Background `bg-backgroundPrimary`, `bg-backgroundSecondary`. Text `text-content1`, `text-content2`. rippleui CSS color vars (e.g. `--gray-2`) are raw space-separated RGB tuples — invalid in `rgb()` directly. Use the component classes instead.

## webjsx

No JSX transpile needed. Use the `h()` factory in `.js` files served directly. `.jsx` with native importmap requires the server to set the correct MIME type, which GH Pages does not — stay in `.js` + `h()`.

`applyDiff(domNode, vnodeOrArray)` — never pass a string. State updates mutate `state` and call `render()`; no reactive system.

## Content format

Markdown with YAML frontmatter:

```markdown
---
title: Home
sections:
  - title: Welcome
    body: Hello world
---

# Home

Full markdown body here.
```

Output `docs/data/pages/index.json`:

```json
{ "title": "Home", "sections": [...], "body": "<p>Full markdown body here.</p>", "slug": "index" }
```

## Gotchas

GH Pages must be set to "GitHub Actions" in Settings → Pages. "Deploy from branch" ignores the deploy-pages action.

`docs/data/` is gitignored; `docs/index.html` and `docs/app.js` are not — they are the committed source files.

`npx flatspace` cold-start is ~10s on first CI run; subsequent runs use the `actions/setup-node` cache.

Pin the webjsx CDN version in importmap (e.g. `@0.0.42`) — `@latest` breaks silently on upstream updates.
