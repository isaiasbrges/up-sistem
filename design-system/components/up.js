/* Software UP — ícones e utilitários do design system. Sem dependências. */
(function () {
  var ICONS = {
  "bell": "<path d=\"M18 8a6 6 0 0 0-12 0v5l-2 4h16l-2-4Z\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>",
  "home": "<path d=\"M3.5 10.5 12 3.5l8.5 7\"/><path d=\"M5.5 9v11.5h13V9\"/><path d=\"M10 20.5v-6h4v6\"/>",
  "clipboard-check": "<path d=\"M9 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-2\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"3\" rx=\"1\"/><path d=\"m9 13.5 2 2 4-4\"/>",
  "chart-bar": "<path d=\"M4 20.5h16\"/><path d=\"M7 17v-6\"/><path d=\"M12 17V6\"/><path d=\"M17 17v-4\"/>",
  "package": "<path d=\"M12 3 20 7.5v9L12 21l-8-4.5v-9Z\"/><path d=\"M4 7.5 12 12l8-4.5\"/><path d=\"M12 12v9\"/>",
  "history": "<path d=\"M3.5 12a8.5 8.5 0 1 0 2.5-6\"/><path d=\"M6 2.5V6h3.5\"/><path d=\"M12 7.5V12l3 2\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4.5 20.5a7.5 7.5 0 0 1 15 0\"/>",
  "users": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0 1 13 0\"/><path d=\"M16 4.6a3.5 3.5 0 0 1 0 6.8\"/><path d=\"M18.5 14.5a6.5 6.5 0 0 1 3 5.5\"/>",
  "log-out": "<path d=\"M9.5 20.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5h3.5\"/><path d=\"M15.5 16.5 20 12l-4.5-4.5\"/><path d=\"M20 12H9.5\"/>",
  "lock": "<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10.5v-3a4 4 0 0 1 8 0v3\"/>",
  "chevron-right": "<path d=\"m9.5 6 6 6-6 6\"/>",
  "chevron-left": "<path d=\"m14.5 6-6 6 6 6\"/>",
  "chevron-down": "<path d=\"m6 9.5 6 6 6-6\"/>",
  "chevron-up": "<path d=\"m6 14.5 6-6 6 6\"/>",
  "check": "<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>",
  "minus": "<path d=\"M5 12h14\"/>",
  "plus": "<path d=\"M12 5v14\"/><path d=\"M5 12h14\"/>",
  "x": "<path d=\"m6 6 12 12\"/><path d=\"M18 6 6 18\"/>",
  "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"m8.5 12.5 2.5 2.5 4.5-5\"/>",
  "triangle-alert": "<path d=\"M10.3 4.2 2.9 17.5a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z\"/><path d=\"M12 9.5v4\"/><path d=\"M12 17h.01\"/>",
  "octagon-alert": "<path d=\"M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3Z\"/><path d=\"M12 8v4.5\"/><path d=\"M12 16h.01\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5\"/><path d=\"M12 8h.01\"/>",
  "circle-help": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.3-2.4 3.6\"/><path d=\"M12 17h.01\"/>",
  "arrow-right": "<path d=\"M4.5 12h15\"/><path d=\"m13.5 6 6 6-6 6\"/>",
  "arrow-left": "<path d=\"M19.5 12h-15\"/><path d=\"m10.5 6-6 6 6 6\"/>",
  "arrow-up-right": "<path d=\"M7 17 17 7\"/><path d=\"M8.5 7H17v8.5\"/>",
  "copy": "<rect x=\"8.5\" y=\"8.5\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3\"/>",
  "message-circle": "<path d=\"M20.5 12a8.5 8.5 0 0 1-12.5 7.5L3.5 20.5l1.1-4.3A8.5 8.5 0 1 1 20.5 12Z\"/>",
  "download": "<path d=\"M12 4v11\"/><path d=\"m7.5 10.5 4.5 4.5 4.5-4.5\"/><path d=\"M4.5 19.5h15\"/>",
  "calendar": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"15.5\" rx=\"2\"/><path d=\"M4 10h16\"/><path d=\"M8.5 3v4\"/><path d=\"M15.5 3v4\"/>",
  "mail": "<rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"2\"/><path d=\"m4 7 8 6 8-6\"/>",
  "refresh-cw": "<path d=\"M19.5 12a7.5 7.5 0 1 1-2.2-5.3\"/><path d=\"M19.5 4v4h-4\"/>",
  "file-text": "<path d=\"M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z\"/><path d=\"M14 3.5v5h5\"/><path d=\"M9 13h6\"/><path d=\"M9 16.5h6\"/>",
  "sliders-horizontal": "<path d=\"M4 7h10\"/><path d=\"M18 7h2\"/><circle cx=\"16\" cy=\"7\" r=\"2\"/><path d=\"M4 17h2\"/><path d=\"M10 17h10\"/><circle cx=\"8\" cy=\"17\" r=\"2\"/>",
  "ellipsis": "<circle cx=\"6\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"18\" cy=\"12\" r=\"1\"/>",
  "menu": "<path d=\"M4 7h16\"/><path d=\"M4 12h16\"/><path d=\"M4 17h16\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m20 20-4.4-4.4\"/>",
  "external-link": "<path d=\"M14 4h6v6\"/><path d=\"m20 4-9 9\"/><path d=\"M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10\"/>",
  "pen-line": "<path d=\"M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z\"/><path d=\"m13.5 6.5 4 4\"/><path d=\"M13 20h7\"/>",
  "crown": "<path d=\"M4 18 3 8l5 3.5L12 5l4 6.5L21 8l-1 10Z\"/><path d=\"M4 21h16\"/>",
  "trending-up": "<path d=\"m3.5 16.5 6-6 4 4 7-7\"/><path d=\"M14.5 7.5h6v6\"/>",
  "trending-down": "<path d=\"m3.5 7.5 6 6 4-4 7 7\"/><path d=\"M14.5 16.5h6v-6\"/>",
  "wallet": "<path d=\"M18.5 7.5V6a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-8.5a2 2 0 0 0-2-2H6\"/><circle cx=\"16.5\" cy=\"14\" r=\"1\"/>",
  "book-open": "<path d=\"M12 6.5c-2-1.5-4.5-2-8-2v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2Z\"/><path d=\"M12 6.5v13\"/>",
  "equal": "<path d=\"M5 9.5h14\"/><path d=\"M5 14.5h14\"/>"
};
  function icon(name, size, label) {
    var body = ICONS[name];
    if (!body) return '';
    var s = size || 20;
    var a11y = label ? ' role="img" aria-label="' + String(label).replace(/"/g, '&quot;') + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="up-icon-svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"' + a11y + '>' + body + '</svg>';
  }
  function hydrate(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-icon-done')) continue;
      el.innerHTML = icon(el.getAttribute('data-icon'), parseInt(el.getAttribute('data-size') || '20', 10), el.getAttribute('data-label'));
      el.setAttribute('data-icon-done', '1');
    }
  }
  function formatBRL(value, opts) {
    var o = opts || {};
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: o.cents === false ? 0 : 2, maximumFractionDigits: o.cents === false ? 0 : 2 }).format(value);
  }
  function formatNumber(value, decimals) {
    var d = decimals == null ? 1 : decimals;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(value);
  }
  window.UP = { icons: ICONS, icon: icon, hydrate: hydrate, formatBRL: formatBRL, formatNumber: formatNumber };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { hydrate(); });
  else hydrate();
})();
