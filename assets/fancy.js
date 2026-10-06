/* Markaz fancy interactions — mobile nav, reveal, counters, tilt, lightbox, back-to-top */
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    try { initHeader(); } catch (e) {}
    try { initMobileNav(); } catch (e) {}
    try { initReveal(); } catch (e) {}
    try { initCounters(); } catch (e) {}
    try { initTilt(); } catch (e) {}
    try { initLightbox(); } catch (e) {}
    try { initTop(); } catch (e) {}
  });

  /* header shadow on scroll */
  function initHeader() {
    var header = document.querySelector('header');
    if (!header) return;
    var ticking = false;
    function update() {
      ticking = false;
      if (window.scrollY > 24) header.classList.add('mk-scrolled');
      else header.classList.remove('mk-scrolled');
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* mobile nav — header nav is desktop-only, so build a drawer from its links */
  function initMobileNav() {
    var header = document.querySelector('header');
    var nav = header && header.querySelector('nav');
    if (!header || !nav) return;
    if (document.getElementById('mk-burger')) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    if (!links.length) return;

    var burger = document.createElement('button');
    burger.id = 'mk-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', 'Open menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span class="material-symbols-outlined">menu</span>';

    var right = header.querySelector('div.flex.items-center.gap-space-lg') || header.firstElementChild;
    (right || header).appendChild(burger);

    var panel = document.createElement('nav');
    panel.id = 'mk-mobile-nav';
    panel.setAttribute('aria-label', 'Mobile');
    links.forEach(function (a) {
      var c = document.createElement('a');
      c.textContent = a.textContent.trim();
      c.href = a.getAttribute('href') || '#';
      panel.appendChild(c);
    });
    document.body.appendChild(panel);

    function setOpen(open) {
      panel.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      burger.innerHTML = '<span class="material-symbols-outlined">' + (open ? 'close' : 'menu') + '</span>';
    }
    var open = false;
    burger.addEventListener('click', function () { open = !open; setOpen(open); });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) { open = false; setOpen(false); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { open = false; setOpen(false); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && open) { open = false; setOpen(false); }
    });
  }

  /* scroll reveal with stagger */
  function initReveal() {
    var targets = document.querySelectorAll('main section, main div[class*="shadow-"]');
    if (!targets.length) return;
    // stagger siblings sharing a parent
    var byParent = new Map();
    Array.prototype.forEach.call(targets, function (el) {
      var p = el.parentElement;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(el);
    });
    byParent.forEach(function (group) {
      group.forEach(function (el, i) {
        el.classList.add('mk-reveal');
        el.style.transitionDelay = Math.min((i % 4) * 70, 280) + 'ms';
      });
    });
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.mk-reveal').forEach(function (el) { el.classList.add('mk-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('mk-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.mk-reveal').forEach(function (el) { io.observe(el); });
  }

  /* animated stat numbers like 500+, 12+, 100% */
  function initCounters() {
    var spans = document.querySelectorAll('main span');
    var nums = [];
    Array.prototype.forEach.call(spans, function (s) {
      var txt = (s.textContent || '').trim();
      var m = txt.match(/^(\d+)\s*(\+|%)$/);
      if (m && !s.dataset.mkCounted) nums.push({ el: s, end: parseInt(m[1], 10), suffix: m[2] });
    });
    if (!nums.length) return;
    function animate(n) {
      if (n.el.dataset.mkCounted) return;
      n.el.dataset.mkCounted = '1';
      var start = null, dur = 1200;
      function frame(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        n.el.textContent = Math.round(n.end * eased) + n.suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    if (!('IntersectionObserver' in window)) { nums.forEach(animate); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var found = nums.filter(function (n) { return n.el === en.target; });
          found.forEach(animate);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n.el); });
  }

  /* subtle 3D tilt on image cards (fine pointers only) */
  function initTilt() {
    if (!window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    var cards = document.querySelectorAll('main div.group');
    Array.prototype.forEach.call(cards, function (card) {
      var raf = null;
      card.addEventListener('mousemove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg) translateY(-4px)';
        });
      });
      card.addEventListener('mouseleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        card.style.transform = '';
      });
    });
  }

  /* click-to-zoom lightbox for content images */
  function initLightbox() {
    if (document.getElementById('mk-lightbox')) return;
    var box = document.createElement('div');
    box.id = 'mk-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Image viewer');
    box.innerHTML = '<img alt=""/><p></p><span>Click anywhere or press Esc to close</span>';
    document.body.appendChild(box);
    var img = box.querySelector('img');
    var cap = box.querySelector('p');
    function close() { box.classList.remove('open'); }
    box.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('main img.object-cover');
      if (!t) return;
      if ((t.alt || '').indexOf('Emblem') !== -1) return;
      img.src = t.currentSrc || t.src;
      img.alt = t.alt || 'Gallery image';
      cap.textContent = t.getAttribute('data-alt') || t.alt || '';
      box.classList.add('open');
    });
  }

  /* back to top */
  function initTop() {
    if (document.getElementById('mk-top')) return;
    var btn = document.createElement('button');
    btn.id = 'mk-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
    document.body.appendChild(btn);
    var ticking = false;
    function update() {
      ticking = false;
      btn.classList.toggle('show', window.scrollY > 600);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    update();
  }
})();
