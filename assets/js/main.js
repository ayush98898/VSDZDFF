(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Header scroll state
     ------------------------------------------------------------------ */
  var header = document.getElementById('siteHeader');
  var backToTop = document.getElementById('backToTop');
  var mobileCta = document.getElementById('mobileCta');
  var hero = document.querySelector('.hero');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (backToTop) backToTop.classList.toggle('is-visible', y > 700);
    if (mobileCta && hero) {
      var heroBottom = hero.offsetTop + hero.offsetHeight;
      mobileCta.classList.toggle('is-visible', y > heroBottom * 0.6);
    }
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('no-scroll');
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('no-scroll', isOpen);
    });

    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ------------------------------------------------------------------
     Countdown to Dev Deepawali — 23 Nov 2026, IST (UTC+5:30)
     ------------------------------------------------------------------ */
  var target = new Date('2026-11-23T00:00:00+05:30').getTime();
  var cdDays = document.getElementById('cdDays');
  var cdHours = document.getElementById('cdHours');
  var cdMins = document.getElementById('cdMins');
  var cdSecs = document.getElementById('cdSecs');

  function pad(n) { return String(n).padStart(2, '0'); }

  function tickCountdown() {
    if (!cdDays) return;
    var now = Date.now();
    var diff = target - now;
    if (diff <= 0) {
      cdDays.textContent = '00';
      cdHours.textContent = '00';
      cdMins.textContent = '00';
      cdSecs.textContent = '00';
      return;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    cdDays.textContent = pad(d);
    cdHours.textContent = pad(h);
    cdMins.textContent = pad(m);
    cdSecs.textContent = pad(s);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ------------------------------------------------------------------
     Diya dot generator (reused for hero row + illumination scene)
     ------------------------------------------------------------------ */
  function fillDiyaRow(container, count) {
    if (!container || container.dataset.built) return;
    container.dataset.built = '1';
    for (var i = 0; i < count; i++) {
      var d = document.createElement('span');
      d.className = 'diya';
      d.style.setProperty('--flicker-delay', (Math.random() * 2.6).toFixed(2) + 's');
      container.appendChild(d);
    }
  }

  fillDiyaRow(document.getElementById('diyaRow'), window.innerWidth < 640 ? 18 : 32);
  fillDiyaRow(document.getElementById('illuminationDiyas'), window.innerWidth < 640 ? 26 : 44);

  var emberField = document.getElementById('heroEmbers');
  if (emberField && !prefersReducedMotion) {
    var emberCount = window.innerWidth < 640 ? 10 : 20;
    for (var j = 0; j < emberCount; j++) {
      var e = document.createElement('span');
      e.className = 'ember';
      var size = (2 + Math.random() * 3).toFixed(1) + 'px';
      e.style.setProperty('--size', size);
      e.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      e.style.setProperty('--dur', (7 + Math.random() * 8).toFixed(1) + 's');
      e.style.setProperty('--delay', (Math.random() * 10).toFixed(1) + 's');
      e.style.setProperty('--drift', (Math.random() * 60 - 30).toFixed(0) + 'px');
      emberField.appendChild(e);
    }
  }

  /* ------------------------------------------------------------------
     Ticker: duplicate content for a seamless infinite loop
     ------------------------------------------------------------------ */
  var tickerTrack = document.getElementById('tickerTrack');
  if (tickerTrack) {
    var clone = tickerTrack.innerHTML;
    tickerTrack.innerHTML = clone + clone;
  }

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (prefersReducedMotion) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Hero entrance (GSAP, respects reduced motion) */
  if (hasGsap && !prefersReducedMotion) {
    gsap.from('.hero-eyebrow-row, .hero-title, .hero-sub, .hero-meta, .hero-actions, .hero-countdown', {
      opacity: 0,
      y: 24,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.09,
      delay: 0.15
    });
  }

  /* ------------------------------------------------------------------
     Chapter progress: right-side rail + floating chapter label
     ------------------------------------------------------------------ */
  var railPoints = [
    { id: 'top', label: 'Prologue', roman: '' },
    { id: 'chapter-arrival', label: 'Arrival', roman: 'I' },
    { id: 'chapter-illumination', label: 'The Illumination', roman: 'II' },
    { id: 'chapter-farewell', label: 'Farewell', roman: 'III' },
    { id: 'packages', label: 'The Details', roman: '' }
  ];
  var railDots = Array.prototype.slice.call(document.querySelectorAll('.rail-dot'));
  var chapterBug = document.getElementById('chapterBug');
  var chapterBugRoman = document.getElementById('chapterBugRoman');
  var chapterBugLabel = document.getElementById('chapterBugLabel');

  railDots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var el = document.getElementById(dot.getAttribute('data-rail-target'));
      if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  function updateChapterProgress() {
    if (!railDots.length && !chapterBug) return;
    var y = (window.scrollY || window.pageYOffset) + window.innerHeight * 0.35;
    var current = railPoints[0];
    for (var i = 0; i < railPoints.length; i++) {
      var el = document.getElementById(railPoints[i].id);
      if (el && el.offsetTop <= y) current = railPoints[i];
    }
    railDots.forEach(function (dot) {
      dot.classList.toggle('is-active', dot.getAttribute('data-rail-target') === current.id);
    });
    if (chapterBug) {
      var show = current.roman !== '';
      chapterBug.classList.toggle('is-visible', show);
      if (show) {
        chapterBugRoman.textContent = current.roman;
        chapterBugLabel.textContent = ' — ' + current.label;
      }
    }
  }
  document.addEventListener('scroll', updateChapterProgress, { passive: true });
  window.addEventListener('resize', updateChapterProgress);
  updateChapterProgress();

  /* ------------------------------------------------------------------
     Chapter II — pinned, scroll-scrubbed "day into night" scene
     Gated to desktop + motion-allowed via GSAP matchMedia; the default
     (non-JS / mobile / reduced-motion) CSS already renders all four
     beats as a normal, fully-readable stacked section.
     ------------------------------------------------------------------ */
  if (hasGsap && window.ScrollTrigger) {
    var illumSection = document.querySelector('.chapter-illumination');
    var pinWrap = document.getElementById('illuminationPinWrap');
    var diyaContainer = document.getElementById('illuminationDiyas');

    if (illumSection && pinWrap) {
      var mm = gsap.matchMedia();
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
        illumSection.classList.add('is-pinned');
        var slides = gsap.utils.toArray('.beat-slide', pinWrap);
        var layers = gsap.utils.toArray('.scene-layer', pinWrap);

        var st = ScrollTrigger.create({
          trigger: pinWrap,
          start: 'top top',
          end: '+=300%',
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          onUpdate: function (self) {
            var raw = self.progress * slides.length;
            var idx = Math.min(slides.length - 1, Math.floor(raw));
            var segProgress = raw - idx;

            slides.forEach(function (s, i) {
              var active = i === idx;
              s.classList.toggle('is-current', active);
              gsap.set(s, { opacity: active ? 1 : 0 });
            });
            layers.forEach(function (l, i) {
              gsap.set(l, { opacity: i === idx ? 1 : 0 });
            });
            if (diyaContainer) {
              var diyaOpacity = idx >= 3 ? 1 : idx === 2 ? segProgress : 0;
              gsap.set(diyaContainer, { opacity: diyaOpacity });
            }

            var bars = slides[idx].querySelectorAll('.beat-progress i');
            bars.forEach(function (bar, bi) {
              var w = bi < idx ? 100 : bi === idx ? segProgress * 100 : 0;
              bar.style.width = w + '%';
            });
          }
        });

        return function cleanup() {
          st.kill();
          illumSection.classList.remove('is-pinned');
          slides.forEach(function (s) { gsap.set(s, { clearProps: 'opacity' }); });
          layers.forEach(function (l) { gsap.set(l, { clearProps: 'opacity' }); });
        };
      });
    }
  }

  /* ------------------------------------------------------------------
     Inclusions pill toggle (Premium / Luxury)
     ------------------------------------------------------------------ */
  var inclusionToggle = document.getElementById('inclusionToggle');
  if (inclusionToggle) {
    var iTabs = Array.prototype.slice.call(inclusionToggle.querySelectorAll('button'));
    var iPanels = {
      'incl-tab-premium': document.getElementById('incl-premium'),
      'incl-tab-luxury': document.getElementById('incl-luxury')
    };
    iTabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        iTabs.forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); b.setAttribute('tabindex', b === btn ? '0' : '-1'); });
        Object.keys(iPanels).forEach(function (id) {
          var match = id === btn.id;
          iPanels[id].classList.toggle('is-active', match);
          if (match) iPanels[id].removeAttribute('hidden');
          else iPanels[id].setAttribute('hidden', '');
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Accordions (Day 2 full schedule + Booking Policies — both use the
     same [data-accordion] component)
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-accordion]').forEach(function (accordion) {
    accordion.querySelectorAll('.accordion-trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.classList.toggle('is-open', !expanded);
      });
    });
  });

  /* ------------------------------------------------------------------
     Testimonials carousel
     ------------------------------------------------------------------ */
  var track = document.getElementById('testimonialTrack');
  if (track) {
    var cards = Array.prototype.slice.call(track.children);
    var dotsWrap = document.getElementById('testDots');
    var prevBtn = document.getElementById('testPrev');
    var nextBtn = document.getElementById('testNext');
    var index = 0;
    var autoTimer = null;

    function perView() {
      var w = window.innerWidth;
      if (w >= 1080) return 3;
      if (w >= 700) return 2;
      return 1;
    }

    function maxIndex() { return Math.max(0, cards.length - perView()); }

    function buildDots() {
      dotsWrap.innerHTML = '';
      var count = maxIndex() + 1;
      for (var i = 0; i < count; i++) {
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Go to testimonial group ' + (i + 1));
        b.setAttribute('aria-current', String(i === index));
        (function (idx) {
          b.addEventListener('click', function () { goTo(idx); });
        })(i);
        dotsWrap.appendChild(b);
      }
    }

    function update() {
      var cardWidth = cards[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).gap || 24);
      var offset = index * (cardWidth + gap);
      track.style.transform = 'translateX(-' + offset + 'px)';
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        dot.setAttribute('aria-current', String(i === index));
      });
    }

    function goTo(i) {
      index = Math.min(Math.max(i, 0), maxIndex());
      update();
    }

    function next() { goTo(index + 1 > maxIndex() ? 0 : index + 1); }
    function prev() { goTo(index - 1 < 0 ? maxIndex() : index - 1); }

    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(); resetAuto(); });

    function startAuto() {
      if (prefersReducedMotion) return;
      autoTimer = setInterval(next, 6000);
    }
    function resetAuto() {
      if (autoTimer) clearInterval(autoTimer);
      startAuto();
    }

    track.addEventListener('mouseenter', function () { if (autoTimer) clearInterval(autoTimer); });
    track.addEventListener('mouseleave', startAuto);
    track.addEventListener('focusin', function () { if (autoTimer) clearInterval(autoTimer); });
    track.addEventListener('focusout', startAuto);

    /* basic touch swipe */
    var touchStartX = null;
    track.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); resetAuto(); }
      touchStartX = null;
    }, { passive: true });

    buildDots();
    update();
    startAuto();

    window.addEventListener('resize', function () {
      buildDots();
      goTo(Math.min(index, maxIndex()));
    });
  }

  /* ------------------------------------------------------------------
     Enquiry form -> prefilled WhatsApp message (no backend attached)
     ------------------------------------------------------------------ */
  var enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = enquiryForm.name.value.trim();
      var phone = enquiryForm.phone.value.trim();
      var guests = enquiryForm.guests.value.trim();
      var pkg = enquiryForm.package.value;
      var message = enquiryForm.message.value.trim();

      var lines = [
        'Hi Wandermate, I would like to enquire about the Dev Deepawali 2026 package.',
        'Name: ' + name,
        'WhatsApp: ' + phone,
        'Guests: ' + guests,
        'Package: ' + pkg
      ];
      if (message) lines.push('Message: ' + message);

      var text = encodeURIComponent(lines.join('\n'));
      window.open('https://wa.me/919214313559?text=' + text, '_blank', 'noopener');
    });
  }

  /* ------------------------------------------------------------------
     GSAP scroll-triggered stagger for card/step/stat groups (progressive
     enhancement on top of the IntersectionObserver reveal above)
     ------------------------------------------------------------------ */
  if (hasGsap && window.ScrollTrigger && !prefersReducedMotion) {
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
      var items = group.querySelectorAll('[data-reveal]');
      ScrollTrigger.batch(items, {
        start: 'top 85%',
        onEnter: function (batch) {
          gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.4)', stagger: 0.08 });
        },
        once: true
      });
    });
  }
})();
