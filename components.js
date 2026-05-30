/**
 * components.js — shared components for all pages
 * Injects: nav, footer, scroll indicator, scroll-to-top, hamburger, right-click disable
 *
 * Usage: place anywhere in <body>
 *   <div id="nav-mount"></div>
 *   <div id="footer-mount"></div>
 *   <script src="/components.js"></script>
 *
 * Options (set before script tag via window.SITE_CONFIG):
 *   SITE_CONFIG.navBorderAlways = true   → border always visible (project pages)
 *   SITE_CONFIG.navBorderAlways = false  → border on scroll only (index)
 */

(function () {
  var cfg = window.SITE_CONFIG || {};

  /* ── NAV HTML ── */
  var navHTML = `
<nav id="main-nav"${cfg.navBorderAlways ? ' class="scrolled"' : ''}>
  <a href="/" class="nav-logo">/\\/ \\/\\/ /\\</a>
  <ul class="nav-links">
    <li><a href="/#works" data-section="works">Architecture</a></li>
    <li><a href="/captures.html">Captures</a></li>
    <li><a href="/#resume" data-section="resume">Resume</a></li>
    <li><a href="/#contact" data-section="contact">Contact</a></li>
  </ul>
  <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">
    <svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="1" x2="20" y2="1"/>
      <line x1="0" y1="7" x2="20" y2="7"/>
      <line x1="0" y1="13" x2="20" y2="13"/>
    </svg>
  </button>
</nav>`;

  /* ── FOOTER HTML ── */
  var footerHTML = `
<footer>
  <span>&#8220;Ars longa, vita brevis.&#8221; &#8212; Hippocrates</span>
  <span>&copy; <span id="footer-year"></span> Nay Win Aung, all rights reserved</span>
</footer>`;

  /* ── SCROLL INDICATOR HTML ── */
  var scrollIndicatorHTML = `<div id="scroll-track"><div id="scroll-thumb"></div></div>`;

  /* ── SCROLL TO TOP HTML ── */
  var scrollTopHTML = `
<button id="scroll-top" aria-label="Back to top">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="18 15 12 9 6 15"/></svg>
</button>`;

  /* ── INJECT ── */
  var navMount = document.getElementById('nav-mount');
  if (navMount) navMount.outerHTML = navHTML;

  var footerMount = document.getElementById('footer-mount');
  if (footerMount) footerMount.outerHTML = footerHTML;

  document.body.insertAdjacentHTML('beforeend', scrollIndicatorHTML + scrollTopHTML);

  /* ── FOOTER YEAR ── */
  var fyEl = document.getElementById('footer-year');
  if (fyEl) fyEl.textContent = new Date().getFullYear();

  /* ── NAV SCROLL BORDER (index only) ── */
  if (!cfg.navBorderAlways) {
    var nav = document.getElementById('main-nav');
    if (nav) {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }
  }

  /* ── HAMBURGER ── */
  (function () {
    var btn = document.getElementById('nav-hamburger');
    var links = document.querySelector('.nav-links');
    if (!btn || !links) return;
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  /* ── SCROLL INDICATOR ── */
  (function () {
    var track = document.getElementById('scroll-track');
    var thumb = document.getElementById('scroll-thumb');
    if (!track || !thumb) return;
    function updateThumb() {
      var trackH = track.offsetHeight;
      var thumbH = thumb.offsetHeight;
      var maxTop = trackH - thumbH;
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      thumb.style.top = (ratio * maxTop) + 'px';
    }
    window.addEventListener('scroll', updateThumb, { passive: true });
    window.addEventListener('resize', updateThumb, { passive: true });
    updateThumb();
  })();

  /* ── SCROLL TO TOP ── */
  (function () {
    var btn = document.getElementById('scroll-top');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  /* ── DISABLE RIGHT-CLICK ── */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

})();
