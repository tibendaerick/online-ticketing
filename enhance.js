(function () {
  'use strict';
  const root = document.documentElement, KEY = 'tp_theme';
  const saved = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  const apply = t => {
    root.dataset.theme = t;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = t === 'light' ? '#F3F4F6' : '#111827';
  };
  apply(saved || 'dark');

  document.addEventListener('DOMContentLoaded', () => {
    const $ = s => document.querySelector(s);

    /* Light / dark toggle */
    const sb = $('#staffBtn'), wrap = document.createElement('div'), tb = document.createElement('button');
    wrap.className = 'actions'; sb.parentNode.insertBefore(wrap, sb);
    tb.className = 'btn ghost icon-btn'; tb.setAttribute('aria-label', 'Toggle light or dark mode');
    const sync = () => {
      const l = root.dataset.theme === 'light';
      tb.textContent = l ? '🌙' : '☀️'; tb.title = l ? 'Switch to dark mode' : 'Switch to light mode';
    };
    tb.onclick = () => {
      const n = root.dataset.theme === 'light' ? 'dark' : 'light';
      apply(n); try { localStorage.setItem(KEY, n); } catch { /* storage blocked */ } sync();
    };
    wrap.append(tb, sb); sync();

    /* Hero pills */
    const hp = $('.hero p');
    if (hp) {
      const p = document.createElement('div'); p.className = 'pills';
      p.innerHTML = ['⚡ Instant QR tickets', '💬 WhatsApp delivery', '🛡️ Fraud-proof gate scanning', '🇺🇬 Priced in UGX']
        .map(t => `<span class="pill">${t}</span>`).join('');
      hp.after(p);
    }

    /* Live search (survives the app re-rendering cards) */
    const s = document.createElement('div'); s.className = 'search';
    s.innerHTML = '<span>🔎</span><input id="evSearch" type="search" placeholder="Search events, venues or categories…" autocomplete="off">';
    $('#filters').before(s);
    const evs = $('#events'), q = $('#evSearch'), empty = document.createElement('div');
    empty.className = 'empty'; empty.hidden = true;
    empty.innerHTML = '<div style="font-size:2.4rem">🎫</div><p>No events match your search.</p>';
    evs.after(empty);
    const filt = () => {
      const v = q.value.trim().toLowerCase(); let n = 0;
      evs.querySelectorAll('.card').forEach(c => {
        const hit = !v || c.textContent.toLowerCase().includes(v);
        c.hidden = !hit; if (hit) n++;
      });
      empty.hidden = n > 0;
    };
    q.addEventListener('input', filt);
    new MutationObserver(filt).observe(evs, { childList: true });

    /* Gate feedback: sound + confetti */
    const AC = window.AudioContext || window.webkitAudioContext; let ctx;
    const beep = ok => {
      if (!AC) return;
      try {
        ctx = ctx || new AC(); ctx.resume(); const t = ctx.currentTime;
        (ok ? [660, 880] : [220, 160]).forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain(), at = t + i * 0.14;
          o.type = ok ? 'sine' : 'sawtooth'; o.frequency.value = f;
          g.gain.setValueAtTime(0.12, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
          o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + 0.22);
        });
      } catch { /* audio unavailable */ }
    };
    const cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.append(cv);
    const boom = () => {
      if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
      const c = cv.getContext('2d'), cols = ['#F97316', '#10B981', '#FBBF24', '#38BDF8', '#F472B6'];
      cv.width = innerWidth; cv.height = innerHeight;
      const ps = Array.from({ length: 90 }, () => ({
        x: innerWidth / 2, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 13 - 3, s: Math.random() * 7 + 4, c: cols[(Math.random() * 5) | 0], r: Math.random() * 6
      }));
      let f = 0;
      (function tick() {
        c.clearRect(0, 0, cv.width, cv.height);
        ps.forEach(p => {
          p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.r += 0.2;
          c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c;
          c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); c.restore();
        });
        if (++f < 90) requestAnimationFrame(tick); else c.clearRect(0, 0, cv.width, cv.height);
      })();
    };
    const res = $('#result');
    new MutationObserver(() => {
      if (res.classList.contains('ok')) { boom(); beep(true); }
      else if (res.classList.contains('bad')) beep(false);
    }).observe(res, { attributes: true, attributeFilter: ['class'] });
  });
})();