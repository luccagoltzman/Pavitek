(function (global) {
  var STORAGE_KEY = "pavitek-theme";

  function readStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark") {
        return v;
      }
    } catch (e) {}
    return null;
  }

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") {
      return t;
    }
    return readStored() || systemTheme();
  }

  /**
   * Aplica o tema na raiz do documento.
   * @param {"light" | "dark"} theme
   * @param {{ persist?: boolean }} [opts]
   */
  function applyTheme(theme, opts) {
    var t = theme === "light" ? "light" : "dark";
    var persist = opts && opts.persist === true;
    document.documentElement.setAttribute("data-theme", t);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch (e) {}
    }
    syncThemeMeta();
    syncToggleUI();
  }

  /** Alterna entre claro e escuro e grava a preferência do utilizador. */
  function toggleTheme() {
    applyTheme(currentTheme() === "light" ? "dark" : "light", {
      persist: true,
    });
  }

  function syncThemeMeta() {
    var meta = document.getElementById("theme-color-meta");
    if (!meta) {
      return;
    }
    var root = getComputedStyle(document.documentElement);
    var c = root.getPropertyValue("--meta-theme-color").trim();
    if (c) {
      meta.setAttribute("content", c);
    }
  }

  function syncToggleUI(button) {
    var btn = button || document.getElementById("theme-toggle");
    if (!btn) {
      return;
    }
    var isLight = currentTheme() === "light";
    btn.setAttribute(
      "aria-label",
      isLight ? "Ativar tema escuro" : "Ativar tema claro",
    );
    btn.setAttribute("title", isLight ? "Tema claro" : "Tema escuro");
  }

  /**
   * Escuta mudanças na preferência do sistema quando não há valor gravado.
   */
  function initTheme() {
    var mq = window.matchMedia("(prefers-color-scheme: light)");
    function onSystemChange() {
      if (readStored() !== null) {
        return;
      }
      applyTheme(systemTheme(), { persist: false });
    }
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onSystemChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onSystemChange);
    }
    syncThemeMeta();
  }

  function initThemeToggle(selector) {
    var btn =
      typeof selector === "string"
        ? document.querySelector(selector)
        : selector;
    if (!btn) {
      return;
    }
    btn.addEventListener("click", function () {
      toggleTheme();
    });
    syncToggleUI(btn);
  }

  global.pavitekTheme = {
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    currentTheme: currentTheme,
    readStoredPreference: readStored,
    initTheme: initTheme,
    initThemeToggle: initThemeToggle,
    syncToggleUI: syncToggleUI,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
