(function () {
  function getCfg() {
    return globalThis.PAVITEK_SUPABASE;
  }

  function publicImageUrl(baseUrl, storagePath) {
    var b = String(baseUrl || "").replace(/\/$/, "");
    var parts = String(storagePath || "")
      .split("/")
      .filter(Boolean)
      .map(function (seg) {
        return encodeURIComponent(seg);
      })
      .join("/");
    return b + "/storage/v1/object/public/service-images/" + parts;
  }

  function slugToId(slug) {
    var s = String(slug || "servico").replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!s) s = "servico";
    return s.slice(0, 80);
  }

  function setJumpNav(jumpEl, services) {
    if (!jumpEl) return;
    jumpEl.innerHTML = "";
    services.forEach(function (svc, i) {
      if (i > 0) {
        var sep = document.createElement("span");
        sep.className = "services__jump-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        jumpEl.appendChild(sep);
      }
      var a = document.createElement("a");
      a.href = "#" + slugToId(svc.slug);
      a.textContent = svc.title;
      jumpEl.appendChild(a);
    });
  }

  function buildCarousel(service, images, baseUrl) {
    var wrap = document.createElement("div");
    wrap.className = "carousel";
    wrap.setAttribute("data-carousel", "");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-roledescription", "Carrossel");
    wrap.setAttribute(
      "aria-label",
      "Fotos do serviço " + service.title,
    );
    wrap.style.setProperty("--carousel-n", String(Math.max(1, images.length)));
    wrap.style.setProperty("--carousel-i", "0");

    var chrome = document.createElement("div");
    chrome.className = "carousel__chrome";

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "carousel__arrow carousel__arrow--prev";
    prev.setAttribute("data-carousel-prev", "");
    prev.setAttribute("aria-label", "Foto anterior");
    prev.textContent = "‹";

    var viewport = document.createElement("div");
    viewport.className = "carousel__viewport";
    viewport.setAttribute("tabindex", "0");

    var track = document.createElement("div");
    track.className = "carousel__track";
    track.setAttribute("data-carousel-track", "");

    images.forEach(function (imgRow, idx) {
      var fig = document.createElement("figure");
      fig.className = "carousel__slide";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "carousel__open";
      btn.setAttribute("data-lightbox-open", "");
      btn.setAttribute(
        "aria-label",
        "Ampliar: " + service.title + ", foto " + (idx + 1),
      );

      var im = document.createElement("img");
      im.src = publicImageUrl(baseUrl, imgRow.storage_path);
      im.alt = imgRow.alt_text || service.title + " — foto " + (idx + 1);
      im.loading = "lazy";
      im.decoding = "async";

      btn.appendChild(im);
      fig.appendChild(btn);
      track.appendChild(fig);
    });

    viewport.appendChild(track);

    var next = document.createElement("button");
    next.type = "button";
    next.className = "carousel__arrow carousel__arrow--next";
    next.setAttribute("data-carousel-next", "");
    next.setAttribute("aria-label", "Próxima foto");
    next.textContent = "›";

    chrome.appendChild(prev);
    chrome.appendChild(viewport);
    chrome.appendChild(next);

    var dots = document.createElement("div");
    dots.className = "carousel__dots";
    dots.setAttribute("data-carousel-dots", "");
    dots.setAttribute("aria-label", "Selecionar foto");

    wrap.appendChild(chrome);
    wrap.appendChild(dots);
    return wrap;
  }

  function renderServices(services, imagesByService, baseUrl) {
    var root = document.getElementById("servicos-root");
    var state = document.getElementById("servicos-state");
    var jump = document.getElementById("services-jump");
    if (!root) return;

    root.innerHTML = "";

    if (!services.length) {
      var p = document.createElement("p");
      p.className = "services__state services__state--error";
      p.textContent =
        "Nenhum serviço cadastrado. Utilize o painel administrativo para adicionar.";
      root.appendChild(p);
      if (jump) jump.innerHTML = "";
      return;
    }

    setJumpNav(jump, services);

    services.forEach(function (svc) {
      var imgs = imagesByService[svc.id] || [];
      imgs.sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

      var art = document.createElement("article");
      art.className = "service";
      art.id = slugToId(svc.slug);

      var head = document.createElement("div");
      head.className = "service__head";

      var h3 = document.createElement("h3");
      h3.className = "service__title";
      h3.textContent = svc.title;

      var desc = document.createElement("p");
      desc.className = "service__text";
      desc.textContent = svc.description || "";

      head.appendChild(h3);
      head.appendChild(desc);
      art.appendChild(head);

      if (imgs.length) {
        art.appendChild(buildCarousel(svc, imgs, baseUrl));
      } else {
        var empty = document.createElement("p");
        empty.className = "services__state";
        empty.style.marginTop = "1rem";
        empty.style.textAlign = "left";
        empty.style.border = "none";
        empty.style.padding = "0";
        empty.textContent =
          "Sem imagens neste serviço. Adicione fotos no painel administrativo.";
        art.appendChild(empty);
      }

      root.appendChild(art);
    });

    if (state) state.remove();

    if (typeof globalThis.pavitekInitCarousels === "function") {
      globalThis.pavitekInitCarousels();
    }
  }

  async function run() {
    var stateEl = document.getElementById("servicos-state");
    var cfg = getCfg();
    if (
      !cfg ||
      !cfg.url ||
      !cfg.anonKey ||
      String(cfg.anonKey).trim().length < 20
    ) {
      if (stateEl) {
        stateEl.textContent =
          "Configure a chave anon em config/supabase.public.js (copie a partir de config/supabase.public.example.js).";
        stateEl.className = "services__state services__state--error";
      }
      return;
    }

    if (typeof globalThis.supabase === "undefined" || !globalThis.supabase.createClient) {
      if (stateEl) {
        stateEl.textContent =
          "Biblioteca Supabase não carregou. Verifique a rede ou o script CDN.";
        stateEl.className = "services__state services__state--error";
      }
      return;
    }

    var client = globalThis.supabase.createClient(cfg.url, cfg.anonKey);

    var sRes = await client
      .from("services")
      .select("id,title,slug,description,sort_order")
      .order("sort_order", { ascending: true });

    if (sRes.error) {
      if (stateEl) {
        stateEl.textContent = "Erro ao carregar serviços: " + sRes.error.message;
        stateEl.className = "services__state services__state--error";
      }
      return;
    }

    var services = sRes.data || [];
    var iRes = await client
      .from("service_images")
      .select("id,service_id,storage_path,sort_order,alt_text")
      .order("sort_order", { ascending: true });

    if (iRes.error) {
      if (stateEl) {
        stateEl.textContent = "Erro ao carregar imagens: " + iRes.error.message;
        stateEl.className = "services__state services__state--error";
      }
      return;
    }

    var imagesByService = {};
    (iRes.data || []).forEach(function (row) {
      if (!imagesByService[row.service_id]) {
        imagesByService[row.service_id] = [];
      }
      imagesByService[row.service_id].push(row);
    });

    renderServices(services, imagesByService, cfg.url);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
