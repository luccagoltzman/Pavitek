(function () {
  var ano = document.getElementById("ano");
  if (ano) {
    ano.textContent = String(new Date().getFullYear());
  }

  var hero = document.querySelector(".hero.hero--video");
  var video = hero && hero.querySelector(".hero__bg-video");
  if (video && typeof video.play === "function") {
    var p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {});
    }
  }

  (function heroParallax() {
    var section = document.querySelector(".page-main > .hero");
    if (!section) {
      return;
    }
    var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMq.matches) {
      return;
    }
    section.classList.add("hero--parallax");

    var ticking = false;
    function update() {
      ticking = false;
      var rect = section.getBoundingClientRect();
      var h = Math.max(rect.height, 1);
      var raw = -rect.top / (h * 0.82);
      var progress = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      section.style.setProperty("--hero-parallax", progress.toFixed(4));
    }

    function onScrollOrResize() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    update();

    function onMotionChange() {
      if (reduceMq.matches) {
        section.classList.remove("hero--parallax");
        section.style.removeProperty("--hero-parallax");
      } else {
        section.classList.add("hero--parallax");
        update();
      }
    }
    if (typeof reduceMq.addEventListener === "function") {
      reduceMq.addEventListener("change", onMotionChange);
    } else if (typeof reduceMq.addListener === "function") {
      reduceMq.addListener(onMotionChange);
    }
  })();

  function slideElements(track) {
    return Array.from(track.querySelectorAll(".carousel__slide")).filter(
      function (s) {
        return !s.classList.contains("is-missing");
      },
    );
  }

  function setupCarousel(root) {
    if (root.getAttribute("data-pavitek-carousel-bound")) {
      return;
    }
    root.setAttribute("data-pavitek-carousel-bound", "1");

    var track = root.querySelector("[data-carousel-track]");
    var prev = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    var dotsEl = root.querySelector("[data-carousel-dots]");
    var viewport = root.querySelector(".carousel__viewport");
    if (!track || !prev || !next) {
      return;
    }

    var index = 0;
    var skipTransitionOnce = true;

    function count() {
      return slideElements(track).length;
    }

    function applyDepthTransforms() {
      var slides = slideElements(track);
      var n = slides.length;
      if (n === 0) {
        return;
      }
      if (index >= n) {
        index = 0;
      }
      if (skipTransitionOnce) {
        track.classList.add("carousel__track--instant");
      }
      slides.forEach(function (slide, i) {
        var rel = i - index;
        var dist = Math.abs(rel);
        var txPercent = rel * 22;
        var scale = Math.max(0.84, 1 - dist * 0.075);
        var opacity = rel === 0 ? 1 : Math.max(0.16, 0.52 - dist * 0.14);
        var tz = rel === 0 ? 0 : -28 - dist * 14;
        slide.style.zIndex = String(30 - dist);
        slide.style.transform =
          "translate3d(" +
          txPercent +
          "%, 0, " +
          tz +
          "px) scale(" +
          scale +
          ")";
        slide.style.opacity = String(opacity);
        slide.style.filter =
          rel === 0 ? "none" : "brightness(0.68) saturate(0.82)";
        slide.classList.toggle("carousel__slide--active", rel === 0);
        slide.style.pointerEvents = rel === 0 ? "" : "none";
        slide.setAttribute("aria-hidden", rel === 0 ? "false" : "true");
        var openBtn = slide.querySelector(".carousel__open");
        if (openBtn) {
          openBtn.tabIndex = rel === 0 ? 0 : -1;
        }
      });
      if (skipTransitionOnce) {
        skipTransitionOnce = false;
        void track.offsetWidth;
        requestAnimationFrame(function () {
          track.classList.remove("carousel__track--instant");
        });
      }
    }

    function apply() {
      var slides = slideElements(track);
      var n = slides.length;
      if (n === 0) {
        root.setAttribute("hidden", "");
        return;
      }
      root.removeAttribute("hidden");
      if (index >= n) {
        index = 0;
      }
      root.classList.toggle("carousel--single", n <= 1);

      applyDepthTransforms();

      prev.disabled = n <= 1;
      next.disabled = n <= 1;

      if (dotsEl) {
        dotsEl.innerHTML = "";
        for (var i = 0; i < n; i++) {
          (function (idx) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "carousel__dot" + (idx === index ? " is-active" : "");
            b.setAttribute(
              "aria-label",
              "Ir para foto " + (idx + 1) + " de " + n,
            );
            if (idx === index) {
              b.setAttribute("aria-current", "true");
            }
            b.addEventListener("click", function () {
              index = idx;
              apply();
            });
            dotsEl.appendChild(b);
          })(i);
        }
      }
    }

    prev.addEventListener("click", function () {
      var n = count();
      if (n < 2) {
        return;
      }
      index = (index - 1 + n) % n;
      apply();
    });

    next.addEventListener("click", function () {
      var n = count();
      if (n < 2) {
        return;
      }
      index = (index + 1) % n;
      apply();
    });

    if (viewport) {
      viewport.addEventListener("keydown", function (e) {
        var n = count();
        if (n < 2) {
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault();
          index = (index - 1 + n) % n;
          apply();
        } else if (e.key === "ArrowRight" || e.key === "PageDown") {
          e.preventDefault();
          index = (index + 1) % n;
          apply();
        }
      });
    }

    track.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () {
        var slide = img.closest(".carousel__slide");
        if (slide) {
          slide.classList.add("is-missing");
        }
        apply();
      });
    });

    apply();
  }

  document.querySelectorAll("[data-carousel]").forEach(setupCarousel);

  globalThis.pavitekInitCarousels = function () {
    document.querySelectorAll("[data-carousel]").forEach(setupCarousel);
  };

  var lb = document.getElementById("lightbox");
  var lbImg = lb && lb.querySelector(".lightbox__img");
  if (lb && lbImg) {
    function openLightbox(src, alt) {
      lbImg.src = src;
      lbImg.alt = alt || "";
      lb.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      var btn = lb.querySelector(".lightbox__close");
      if (btn) {
        btn.focus();
      }
    }

    function closeLightbox() {
      lb.setAttribute("hidden", "");
      lbImg.removeAttribute("src");
      lbImg.alt = "";
      document.body.style.overflow = "";
    }

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) {
        return;
      }
      var opener = t.closest("[data-lightbox-open]");
      if (!opener) {
        return;
      }
      var im = opener.querySelector("img");
      if (!im) {
        return;
      }
      var src = im.getAttribute("src");
      if (!src) {
        return;
      }
      e.preventDefault();
      openLightbox(src, im.getAttribute("alt") || "");
    });

    lb.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        closeLightbox();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lb.hasAttribute("hidden")) {
        closeLightbox();
      }
    });
  }
})();
