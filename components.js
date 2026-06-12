/**
 * components.js — shared components for all pages
 * Injects: nav (with search), footer, scroll indicator, scroll-to-top,
 * hamburger, scroll-reveal engine, image load fade, right-click disable
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

  /* ── SHARED STYLESHEET GUARD ── */
  if (!document.querySelector('link[href="/site.css"]')) {
    var cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/site.css';
    document.head.appendChild(cssLink);
  }

  var searchIconSVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="7" cy="7" r="5"/><line x1="10.8" y1="10.8" x2="14.5" y2="14.5"/></svg>';

  /* ── NAV HTML ── */
  var navHTML = `
<nav id="main-nav"${cfg.navBorderAlways ? ' class="scrolled"' : ''}>
  <a href="/" class="nav-logo">/\\/ \\/\\/ /\\</a>
  <div class="nav-right">
    <ul class="nav-links">
      <li class="nav-search-row">
        <div class="nav-search-field" role="search">
          ${searchIconSVG}
          <input id="search-input-mobile" type="search" placeholder="Search projects" aria-label="Search projects" autocomplete="off">
        </div>
        <div class="search-results" id="search-results-mobile" role="listbox" aria-label="Search results"></div>
      </li>
      <li><a href="/#works" data-section="works">Architecture</a></li>
      <li><a href="/captures.html">Captures</a></li>
      <li><a href="/#resume" data-section="resume">Resume</a></li>
      <li><a href="/#contact" data-section="contact">Contact</a></li>
    </ul>
    <div class="nav-search" id="nav-search" role="search">
      <input id="search-input" type="search" placeholder="Search projects" aria-label="Search projects" autocomplete="off">
      <button class="nav-search-toggle" id="search-toggle" aria-label="Search" aria-expanded="false">
        ${searchIconSVG}
      </button>
      <div class="search-results" id="search-results-desktop" role="listbox" aria-label="Search results"></div>
    </div>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">
      <svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="20" y2="1"/>
        <line x1="0" y1="7" x2="20" y2="7"/>
        <line x1="0" y1="13" x2="20" y2="13"/>
      </svg>
    </button>
  </div>
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
      if (open) {
        var mInput = document.getElementById('search-input-mobile');
        if (mInput) { mInput.value = ''; }
        var mResults = document.getElementById('search-results-mobile');
        if (mResults) { mResults.classList.remove('has-results'); mResults.innerHTML = ''; }
      }
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  /* ── SEARCH ──
     Index is built from the live project grid on the homepage, or by
     fetching /index.html elsewhere — so newly published projects are
     searchable with no extra maintenance. Cards carry internal
     data-tags keywords that are matched but never displayed. */
  (function () {
    var searchIndex = null;
    var pending = [];
    var loading = false;

    var STATIC_PAGES = [
      { title: 'Captures', sub: 'Sketches · Photos', url: '/captures.html', tags: 'captures sketches photography drawings photos' },
      { title: 'Resume',   sub: 'CV',                url: '/#resume',       tags: 'resume cv education experience skills languages' },
      { title: 'Contact',  sub: 'Get in touch',      url: '/#contact',      tags: 'contact email message reach out' }
    ];

    function extractFromDoc(doc) {
      var items = [];
      var cards = doc.querySelectorAll('#project-grid .card');
      Array.prototype.forEach.call(cards, function (card) {
        var nameEl = card.querySelector('.card-name');
        var catEl  = card.querySelector('.card-cat');
        if (!nameEl) return;
        var href = card.getAttribute('href');
        items.push({
          title: nameEl.textContent.trim(),
          sub:   catEl ? catEl.textContent.trim() : '',
          url:   href ? '/' + href.replace(/^\//, '') : '/?filter=models#works',
          tags:  (card.getAttribute('data-tags') || '').toLowerCase()
        });
      });
      return items.concat(STATIC_PAGES);
    }

    function loadIndex(cb) {
      if (searchIndex) { cb(searchIndex); return; }
      pending.push(cb);
      if (loading) return;
      if (document.getElementById('project-grid')) {
        searchIndex = extractFromDoc(document);
        flush();
        return;
      }
      loading = true;
      fetch('/index.html')
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          searchIndex = extractFromDoc(doc);
        })
        .catch(function () { searchIndex = STATIC_PAGES.slice(); })
        .then(flush);
    }

    function flush() {
      var cbs = pending.splice(0);
      cbs.forEach(function (cb) { cb(searchIndex); });
    }

    function match(items, query) {
      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return [];
      return items.filter(function (it) {
        var hay = (it.title + ' ' + it.sub + ' ' + it.tags).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      }).slice(0, 8);
    }

    function attachSearch(input, resultsEl) {
      if (!input || !resultsEl) return;
      var activeIdx = -1;
      var current = [];

      function render(items, query) {
        current = items;
        activeIdx = -1;
        if (!query) {
          resultsEl.classList.remove('has-results');
          resultsEl.innerHTML = '';
          return;
        }
        resultsEl.classList.add('has-results');
        if (!items.length) {
          resultsEl.innerHTML = '<div class="search-no-results">No matches</div>';
          return;
        }
        resultsEl.innerHTML = items.map(function (it, i) {
          return '<a class="search-result" role="option" id="' + resultsEl.id + '-opt-' + i + '" href="' + it.url + '">' +
            '<span class="sr-title">' + it.title + '</span>' +
            '<span class="sr-sub">' + it.sub + '</span></a>';
        }).join('');
      }

      function setActive(i) {
        var rows = resultsEl.querySelectorAll('.search-result');
        if (!rows.length) return;
        activeIdx = (i + rows.length) % rows.length;
        Array.prototype.forEach.call(rows, function (row, j) {
          row.classList.toggle('active', j === activeIdx);
        });
        input.setAttribute('aria-activedescendant', resultsEl.id + '-opt-' + activeIdx);
      }

      input.addEventListener('focus', function () { loadIndex(function () {}); });
      input.addEventListener('input', function () {
        var q = input.value.trim();
        loadIndex(function (items) { render(match(items, q), q); });
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
        else if (e.key === 'Enter' && activeIdx >= 0 && current[activeIdx]) {
          e.preventDefault();
          window.location.href = current[activeIdx].url;
        } else if (e.key === 'Escape') {
          input.value = '';
          render([], '');
          input.blur();
          var wrap = document.getElementById('nav-search');
          if (wrap && wrap.contains(input)) closeDesktopSearch();
        }
      });
      return { render: render };
    }

    /* desktop: icon expands to reveal field */
    var wrap   = document.getElementById('nav-search');
    var toggle = document.getElementById('search-toggle');
    var dInput = document.getElementById('search-input');
    var dResults = document.getElementById('search-results-desktop');
    var dCtl = attachSearch(dInput, dResults);

    function closeDesktopSearch() {
      if (!wrap) return;
      wrap.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (dInput) dInput.value = '';
      if (dCtl) dCtl.render([], '');
    }

    if (toggle && wrap && dInput) {
      toggle.addEventListener('click', function () {
        if (wrap.classList.contains('open') && !dInput.value.trim()) {
          closeDesktopSearch();
          return;
        }
        wrap.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        dInput.focus();
        loadIndex(function () {});
      });
      document.addEventListener('click', function (e) {
        if (wrap.classList.contains('open') && !wrap.contains(e.target)) closeDesktopSearch();
      });
    }

    /* mobile: field lives at the top of the hamburger menu */
    attachSearch(
      document.getElementById('search-input-mobile'),
      document.getElementById('search-results-mobile')
    );
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

  /* ── SCROLL REVEAL ──
     Tags elements with .rv (hidden) then .rv-in when they enter the
     viewport. Applied only via JS so no-JS visitors see everything;
     skipped entirely under prefers-reduced-motion. */
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    var SEL = '.card, .filter-row, .section-label, .resume-left, .cv-block, ' +
              '.contact-left, .contact-form, .masonry-item, ' +
              '.project-header .project-hero, .project-header .project-info, ' +
              '.project-images .img-wrap';

    var io = new IntersectionObserver(function (entries) {
      var delay = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        en.target.style.transitionDelay = delay + 'ms';
        delay = Math.min(delay + 70, 350);
        en.target.classList.add('rv-in');
        en.target.addEventListener('transitionend', function te() {
          en.target.style.transitionDelay = '';
          en.target.removeEventListener('transitionend', te);
        });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    document.querySelectorAll(SEL).forEach(function (el) {
      el.classList.add('rv');
      io.observe(el);
    });
  })();

  /* ── IMAGE LOAD FADE (gallery images only) ── */
  (function () {
    var imgs = document.querySelectorAll('.project-images img, .project-hero img, .masonry-item img');
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.complete) return;
      img.classList.add('img-loading');
      var clear = function () { img.classList.remove('img-loading'); };
      img.addEventListener('load', clear, { once: true });
      img.addEventListener('error', clear, { once: true });
    });
  })();

  /* ── DISABLE RIGHT-CLICK ── */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

})();
