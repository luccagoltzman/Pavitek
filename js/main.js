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

    function count() {
      return slideElements(track).length;
    }

    function apply() {
      var n = count();
      if (n === 0) {
        root.setAttribute("hidden", "");
        return;
      }
      root.removeAttribute("hidden");
      if (index >= n) {
        index = 0;
      }
      root.style.setProperty("--carousel-n", String(Math.max(1, n)));
      root.style.setProperty("--carousel-i", String(index));
      root.classList.toggle("carousel--single", n <= 1);

      slideElements(track).forEach(function (slide, i) {
        slide.setAttribute("aria-hidden", i === index ? "false" : "true");
      });

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
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          index = (index - 1 + n) % n;
          apply();
        } else if (e.key === "ArrowRight") {
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
