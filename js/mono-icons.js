(function() {
  const scriptEl = document.currentScript;
  const spritePath = (scriptEl && scriptEl.dataset.iconSprite) || window.__ICON_SPRITE_PATH__ || '../assets/icons/mono-icons.svg';
  const INLINE_SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden;">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5 10.5V21a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </symbol>

  <symbol id="icon-sun" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-moon" viewBox="0 0 24 24">
    <path d="M17 3.5A7.5 7.5 0 1 1 9 20.5 6 6 0 0 0 17 3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </symbol>

  <symbol id="icon-lock" viewBox="0 0 24 24">
    <rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    <path d="M12 15v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-clipboard" viewBox="0 0 24 24">
    <rect x="6" y="5" width="12" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M9 5V3h6v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    <path d="M9 9h6M9 13h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-upload" viewBox="0 0 24 24">
    <path d="M12 18V6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    <path d="M8.5 9 12 5.5 15.5 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-sync" viewBox="0 0 24 24">
    <path d="M7 8a5 5 0 0 1 8.5-3.5L18 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M17 16a5 5 0 0 1-8.5 3.5L6 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15 4h3v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9 20H6v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </symbol>

  <symbol id="icon-gear" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M12 4V2M12 22v-2M4 12H2m20 0h-2M6.5 6.5 5 5M19 19l-1.5-1.5M17.5 6.5 19 5M5 19l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2" />
  </symbol>

  <symbol id="icon-document" viewBox="0 0 24 24">
    <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
    <path d="M15 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9 12h6M9 16h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-pencil" viewBox="0 0 24 24">
    <path d="M4 20l5-.5L20 8.5 15.5 4 4.5 15z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14.5 4.5 19 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-check" viewBox="0 0 24 24">
    <path d="M5.5 12.5 10 17l8.5-8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </symbol>

  <symbol id="icon-export" viewBox="0 0 24 24">
    <path d="M12 4v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    <path d="M8.5 7.5 12 4l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5 19h14v3H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
  </symbol>

  <symbol id="icon-plus" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </symbol>

  <symbol id="icon-refresh" viewBox="0 0 24 24">
    <path d="M7 10a5 5 0 0 1 8.5-3.5L18 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M17 14a5 5 0 0 1-8.5 3.5L6 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15 4h3v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M9 20H6v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </symbol>

  <symbol id="icon-eye" viewBox="0 0 24 24">
    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
  </symbol>

  <symbol id="icon-circle" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
  </symbol>
</svg>`;

  function mountSprite(svgText) {
    if (!svgText || window.__MONO_ICON_SPRITE_ATTACHED__) return;
    const mount = () => {
      if (window.__MONO_ICON_SPRITE_ATTACHED__) return;
      const wrapper = document.createElement('div');
      wrapper.style.display = 'none';
      wrapper.setAttribute('data-mono-icon-sprite', 'true');
      wrapper.innerHTML = svgText;
      const target = document.body || document.documentElement;
      target.insertBefore(wrapper, target.firstChild || null);
      window.__MONO_ICON_SPRITE_ATTACHED__ = true;
    };

    if (document.body) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    }
  }

  function ensureSprite() {
    if (window.__MONO_ICON_SPRITE_ATTACHED__) return Promise.resolve();
    if (window.__MONO_ICON_SPRITE_PROMISE__) return window.__MONO_ICON_SPRITE_PROMISE__;

    const isFileProtocol = typeof window !== 'undefined'
      && window.location
      && window.location.protocol === 'file:';

    if (isFileProtocol) {
      mountSprite(INLINE_SPRITE);
      window.__MONO_ICON_SPRITE_PROMISE__ = Promise.resolve(INLINE_SPRITE);
      return window.__MONO_ICON_SPRITE_PROMISE__;
    }

    window.__MONO_ICON_SPRITE_PROMISE__ = fetch(spritePath)
      .then((resp) => {
        if (!resp.ok) throw new Error(`Failed to load mono icon sprite: ${resp.status}`);
        return resp.text();
      })
      .then((svgText) => {
        mountSprite(svgText);
        return svgText;
      })
      .catch((error) => {
        console.error('[mono-icons] sprite load failed', error);
        mountSprite(INLINE_SPRITE);
        return INLINE_SPRITE;
      });

    return window.__MONO_ICON_SPRITE_PROMISE__;
  }

  const spriteReady = ensureSprite();
  window.monoIconSpriteReady = spriteReady;

  if (!window.renderMonoIcon) {
    window.renderMonoIcon = function(name, extraClass = '') {
      if (!name) return '';
      const classes = ['mono-icon', `icon-${name}`];
      if (extraClass) classes.push(extraClass);
      return `<svg class="${classes.join(' ')}" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`;
    };
  }

  const emojiToIconMap = {
    '🏠': 'home',
    '☀️': 'sun',
    '🌙': 'moon',
    '🔐': 'lock',
    '📋': 'clipboard',
    '📤': 'export',
    '🔄': 'sync',
    '⚙️': 'gear',
    '📄': 'document',
    '✏️': 'pencil',
    '✅': 'check',
    '🔧': 'gear',
    '✓': 'check',
    '◉': 'circle',
    '○': 'circle'
  };

  function replaceEmojiWithIcon(element, fallbackIcon, extraClass = '') {
    if (!element || element.querySelector('svg')) return;
    const raw = (element.dataset && element.dataset.icon) || (element.textContent || '').trim();
    const iconName = fallbackIcon || emojiToIconMap[raw];
    if (!iconName) return;
    element.innerHTML = window.renderMonoIcon(iconName, extraClass);
  }

  function hydrateMonoIconPlaceholders() {
    document.querySelectorAll('[data-icon]').forEach((el) => {
      replaceEmojiWithIcon(el, el.dataset.icon);
    });

    document.querySelectorAll('.icon-button').forEach((el) => {
      replaceEmojiWithIcon(el, el.dataset.icon || 'home');
    });

    document.querySelectorAll('.dark-mode-toggle .icon-sun').forEach((el) => {
      replaceEmojiWithIcon(el, 'sun');
    });

    document.querySelectorAll('.dark-mode-toggle .icon-moon').forEach((el) => {
      replaceEmojiWithIcon(el, 'moon');
    });

    document.querySelectorAll('.workflow-stage .stage-icon').forEach((el) => {
      replaceEmojiWithIcon(el);
    });

    document.querySelectorAll('.workflow-stage .stage-status').forEach((el) => {
      const text = (el.textContent || '').trim();
      const fallback = text === '✓' ? 'check' : 'circle';
      const extra = fallback === 'circle' ? 'small-icon' : '';
      replaceEmojiWithIcon(el, fallback, extra);
    });

    document.querySelectorAll('.workflow-sidebar a span').forEach((el) => {
      replaceEmojiWithIcon(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateMonoIconPlaceholders);
  } else {
    hydrateMonoIconPlaceholders();
  }
})();
