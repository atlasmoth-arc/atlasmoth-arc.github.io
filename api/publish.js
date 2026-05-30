// api/publish.js
// Generates project HTML from template, patches index.html grid, commits both to GitHub via API.

import { parse }     from 'cookie';
import { createHmac } from 'crypto';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER; // e.g. "atlasmoth-arc"
const GITHUB_REPO  = process.env.GITHUB_REPO;  // e.g. "atlasmoth-arc.github.io"
const BRANCH       = process.env.GITHUB_BRANCH || 'main';
const SECRET       = process.env.COOKIE_SECRET || process.env.ADMIN_PASSWORD;

/* ── AUTH ── */
function verifySession(req) {
  const cookies = parse(req.headers.cookie || '');
  const token   = cookies.admin_session || '';
  const [value, sig] = token.split('.');
  if (!value || !sig) return false;
  const expected = createHmac('sha256', SECRET).update(value).digest('base64url');
  return sig === expected && value === 'admin';
}

/* ── GITHUB HELPERS ── */
async function ghGet(path) {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!r.ok) throw new Error(`GitHub GET ${path} → ${r.status}`);
  return r.json();
}

async function ghPut(path, content, sha, message) {
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch:  BRANCH,
  };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method:  'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept:        'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`GitHub PUT ${path} → ${r.status}: ${err}`);
  }
  return r.json();
}

/* ── PROJECT PAGE TEMPLATE ── */
function buildProjectPage(data) {
  const {
    slug, title, year, type, location, role, category,
    description, images, heroImage, hasCopyright,
  } = data;

  const locationRow = location
    ? `<div class="meta-row"><span class="meta-label">Location</span><span class="meta-value">${location}</span></div>`
    : '';

  const imgWraps = images.map(src =>
    `      <div class="img-wrap"><img src="${src}" alt="${title}" loading="lazy"></div>`
  ).join('\n');

  const descParagraphs = (Array.isArray(description) ? description : [description])
    .filter(Boolean)
    .map(p => `      <p>${p}</p>`)
    .join('\n');

  const copyrightCSS = hasCopyright ? `
    .img-wrap::before {
      content: '\\00a9\\a0 Design 2000 co. ltd';
      position: absolute;
      bottom: 12px; right: 16px;
      font-family: var(--mono);
      font-size: 10px;
      font-weight: 300;
      letter-spacing: .08em;
      color: rgba(245,244,240,.45);
      pointer-events: none;
      z-index: 2;
    }
    .img-wrap { position: relative; }` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Nay Win Aung</title>
  <meta name="description" content="${title} — architecture project by Nay Win Aung.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>⌂</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400&family=Quicksand:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:        #f5f4f0;
      --ink:       #1a1a18;
      --ink-faint: #9a9890;
      --serif:     'EB Garamond', Georgia, serif;
      --sans:      'Quicksand', sans-serif;
      --mono:      'DM Mono', monospace;
      --nav-h:     56px;
      --gutter:    clamp(24px, 5vw, 72px);
    }
    html { scroll-behavior: smooth; scrollbar-width: none; }
    ::-webkit-scrollbar { display: none; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-weight: 400; font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }

    /* ── NAV (shared via components.js) ── */
    nav { position: fixed; top: 0; left: 0; right: 0; height: var(--nav-h); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--gutter); background: var(--bg); z-index: 100; border-bottom: 1px solid #dddbd5; transition: border-color .3s; }
    .nav-logo { font-family: var(--mono); font-size: 13px; font-weight: 300; letter-spacing: .04em; color: var(--ink); text-decoration: none; white-space: nowrap; }
    .nav-links { display: flex; gap: 36px; list-style: none; }
    .nav-links a { font-family: var(--mono); font-size: 11px; font-weight: 300; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); text-decoration: none; transition: color .2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--ink); }
    .nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; margin-right: -4px; }
    .nav-hamburger svg { display: block; width: 20px; height: 14px; stroke: var(--ink); fill: none; stroke-width: 2; stroke-linecap: round; }
    @media (max-width: 600px) {
      .nav-hamburger { display: flex; align-items: center; }
      .nav-links { display: none; position: absolute; top: var(--nav-h); left: 0; right: 0; background: var(--bg); flex-direction: column; gap: 0; border-bottom: 1px solid #dddbd5; padding: 8px 0; z-index: 99; }
      .nav-links.open { display: flex; }
      .nav-links li { width: 100%; }
      .nav-links a { display: block; padding: 12px var(--gutter); font-size: 12px; letter-spacing: .1em; }
    }

    /* ── PROJECT PAGE ── */
    .project-wrap { padding-top: calc(var(--nav-h) + 56px); padding-bottom: 120px; padding-left: var(--gutter); padding-right: var(--gutter); max-width: 1400px; margin: 0 auto; }
    .project-header { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: stretch; margin-bottom: 72px; }
    .project-hero { overflow: hidden; }
    .project-hero img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .project-info { display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 4px; }
    .project-label { font-family: var(--mono); font-size: 10px; font-weight: 300; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 20px; }
    .project-title { font-family: var(--sans); font-size: clamp(28px, 4vw, 48px); font-weight: 400; line-height: 1.15; margin-bottom: 32px; }
    .meta-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 40px; }
    .meta-row { display: flex; gap: 20px; align-items: baseline; }
    .meta-label { font-family: var(--mono); font-size: 10px; font-weight: 300; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); min-width: 72px; }
    .meta-value { font-size: 15px; color: var(--ink); }
    .project-description { font-size: 16px; color: #444; line-height: 1.8; max-width: 540px; }
    .project-description p + p { margin-top: 16px; }
    .project-images { display: flex; flex-direction: column; gap: 2px; }
    .img-wrap { overflow: hidden; width: 100%; }
    .img-wrap img { width: 100%; height: auto; display: block; }${copyrightCSS}

    /* ── FOOTER ── */
    footer { border-top: 1px solid #dddbd5; padding: 28px var(--gutter); display: flex; justify-content: space-between; align-items: center; }
    footer span { font-family: var(--mono); font-size: 10px; font-weight: 300; letter-spacing: .1em; color: var(--ink-faint); }

    /* ── SCROLL INDICATOR ── */
    #scroll-track { position: fixed; right: 18px; top: 14%; height: 72%; width: 1px; background: rgba(154,152,144,.20); z-index: 98; pointer-events: none; }
    #scroll-thumb { position: absolute; left: 50%; transform: translateX(-50%); width: 3px; height: 32px; border-radius: 2px; background: rgba(154,152,144,.50); top: 0; transition: top .12s linear; }
    @media (max-width: 768px) { #scroll-track { display: none; } }

    /* ── SCROLL TO TOP ── */
    #scroll-top { position: fixed; bottom: 36px; right: 36px; width: 44px; height: 44px; border-radius: 50%; border: 1px solid #ccc; background: var(--bg); display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; pointer-events: none; transition: opacity .3s, border-color .2s, background .2s; z-index: 99; }
    #scroll-top.visible { opacity: 1; pointer-events: auto; }
    #scroll-top:hover { border-color: var(--ink); background: var(--ink); }
    #scroll-top svg { width: 14px; height: 14px; stroke: var(--ink); fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; transition: stroke .2s; }
    #scroll-top:hover svg { stroke: var(--bg); }
    @media (max-width: 480px) { #scroll-top { bottom: 20px; right: 20px; } }

    @media (max-width: 768px) {
      .project-header { grid-template-columns: 1fr; }
      .project-info { padding-bottom: 0; }
    }
  </style>
</head>
<body>

  <div id="nav-mount"></div>

  <div class="project-wrap">
    <div class="project-header">
      <div class="project-hero">
        <img src="${heroImage}" alt="${title}">
      </div>
      <div class="project-info">
        <span class="project-label">${category}</span>
        <h1 class="project-title">${title}</h1>
        <div class="meta-list">
          <div class="meta-row"><span class="meta-label">Year</span><span class="meta-value">${year}</span></div>
          <div class="meta-row"><span class="meta-label">Type</span><span class="meta-value">${type}</span></div>
          ${locationRow}
          <div class="meta-row"><span class="meta-label">Role</span><span class="meta-value">${role}</span></div>
        </div>
        <div class="project-description">
${descParagraphs}
        </div>
      </div>
    </div>

    <div class="project-images">
${imgWraps}
    </div>
  </div>

  <div id="footer-mount"></div>

  <script>
    window.SITE_CONFIG = { navBorderAlways: true };
  </script>
  <script src="/components.js"></script>

</body>
</html>`;
}

/* ── INDEX CARD INJECTION ── */
function buildCard(data) {
  const { slug, title, year, category, displayCat } = data;
  const catLabel = displayCat || (category.charAt(0).toUpperCase() + category.slice(1));
  return `      <a href="projects/${slug}.html" class="card" data-cat="${category}" data-order="${data.order}">
        <img src="images/${slug}/hero.png" alt="${title}" loading="lazy">
        <div class="card-overlay">
          <span class="card-name">${title}</span>
          <span class="card-cat">${catLabel} · ${year}</span>
          <span class="card-arrow">→</span>
        </div>
      </a>`;
}

function injectCard(indexHTML, cardHTML, order) {
  // Find all cards with data-order attributes, insert at correct position
  // Models card (id="models-card") is always last — insert before it if order is high
  const cards = [];
  const cardRegex = /(<(?:a|div)[^>]*data-order="(\d+)"[^>]*>[\s\S]*?<\/(?:a|div)>)/g;

  // Simple approach: find the models-card and insert before it if position >= all others,
  // otherwise find the first card whose order > new card's order and insert before it.
  const modelsCardMatch = indexHTML.match(/(\s*<!-- Single Models card[\s\S]*?<\/div>\s*\n)/);
  const insertMarker = '      <!-- Single Models card';

  // Find all existing data-order values to determine insertion point
  const orderMatches = [...indexHTML.matchAll(/data-order="(\d+)"/g)].map(m => parseInt(m[1]));
  const maxExistingOrder = Math.max(...orderMatches.filter(n => !isNaN(n)));

  let newHTML;

  if (order > maxExistingOrder) {
    // Insert just before models card comment
    newHTML = indexHTML.replace(
      '      <!-- Single Models card',
      cardHTML + '\n\n      <!-- Single Models card'
    );
  } else {
    // Insert before the first card whose order >= our new card's order
    // Find the right insertion point by scanning for data-order values
    const insertBefore = new RegExp(
      `(\\s*<(?:a|div)[^>]*data-order="${order}"[^>]*>)`, 'g'
    );
    // If exact order exists, insert before it
    if (insertBefore.test(indexHTML)) {
      newHTML = indexHTML.replace(
        new RegExp(`(\\s*)(<(?:a|div)[^>]*data-order="${order}"[^>]*>)`),
        '\n' + cardHTML + '\n\n$1$2'
      );
    } else {
      // Find first card with order > new order
      let insertionDone = false;
      newHTML = indexHTML.replace(
        /(\s*)(<(?:a|div)[^>]*data-order="(\d+)")/g,
        function (match, ws, tag, existingOrder) {
          if (!insertionDone && parseInt(existingOrder) > order) {
            insertionDone = true;
            return '\n' + cardHTML + '\n\n' + ws + tag;
          }
          return match;
        }
      );
      if (!insertionDone) {
        // Fallback: before models card
        newHTML = indexHTML.replace(
          '      <!-- Single Models card',
          cardHTML + '\n\n      <!-- Single Models card'
        );
      }
    }
  }

  return newHTML;
}

/* ── MAIN HANDLER ── */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!verifySession(req))   return res.status(401).json({ error: 'Unauthorized' });

  const {
    slug, title, year, type, location, role,
    category, displayCat, description, order,
    heroImage, images, hasCopyright,
  } = req.body;

  if (!slug || !title || !year || !category) {
    return res.status(400).json({ error: 'Missing required fields: slug, title, year, category' });
  }

  try {
    // 1. Build project page HTML
    const projectHTML = buildProjectPage({
      slug, title, year, type, location, role,
      category, description, images: images || [],
      heroImage: heroImage || `images/${slug}/hero.png`,
      hasCopyright: !!hasCopyright,
    });

    // 2. Get current index.html from GitHub
    const indexFile  = await ghGet('index.html');
    const currentIndex = Buffer.from(indexFile.content, 'base64').toString('utf8');

    // 3. Build new card HTML
    const cardHTML = buildCard({ slug, title, year, category, displayCat, order: order || 99 });

    // 4. Inject card into grid
    const updatedIndex = injectCard(currentIndex, cardHTML, order || 99);

    // 5. Get existing project file SHA if it exists (for update)
    let projectSha;
    try {
      const existing = await ghGet(`projects/${slug}.html`);
      projectSha = existing.sha;
    } catch (_) { /* new file */ }

    // 6. Commit both files
    await ghPut(
      `projects/${slug}.html`,
      projectHTML,
      projectSha,
      `Add project: ${title}`
    );
    await ghPut(
      'index.html',
      updatedIndex,
      indexFile.sha,
      `Add ${title} card to index`
    );

    return res.status(200).json({ ok: true, slug, message: `Published "${title}" successfully.` });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
