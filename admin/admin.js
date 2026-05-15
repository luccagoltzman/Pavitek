(function () {
  var cfg = globalThis.PAVITEK_SUPABASE;
  var client = null;

  var el = {
    loginPanel: document.getElementById("login-panel"),
    appPanel: document.getElementById("app-panel"),
    configError: document.getElementById("config-error"),
    authZone: document.getElementById("auth-zone"),
    formLogin: document.getElementById("form-login"),
    loginError: document.getElementById("login-error"),
    tableWrap: document.getElementById("services-table-wrap"),
    btnNew: document.getElementById("btn-new-service"),
    dlgService: document.getElementById("dlg-service"),
    formService: document.getElementById("form-service"),
    svcCancel: document.getElementById("svc-cancel"),
    svcFormError: document.getElementById("svc-form-error"),
    dlgImages: document.getElementById("dlg-images"),
    btnCloseImages: document.getElementById("btn-close-images"),
    imgServiceId: document.getElementById("img-service-id"),
    imgList: document.getElementById("img-list"),
    imgFiles: document.getElementById("img-files"),
    imgFilesTrigger: document.getElementById("img-files-trigger"),
    imgStatus: document.getElementById("img-status"),
    dlgImagesTitle: document.getElementById("dlg-images-title"),
  };

  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function publicUrl(path) {
    var b = String(cfg.url || "").replace(/\/$/, "");
    var parts = String(path || "")
      .split("/")
      .filter(Boolean)
      .map(function (s) {
        return encodeURIComponent(s);
      })
      .join("/");
    return b + "/storage/v1/object/public/service-images/" + parts;
  }

  function hasConfig() {
    return (
      cfg &&
      cfg.url &&
      cfg.anonKey &&
      String(cfg.anonKey).trim().length >= 20
    );
  }

  function showConfigError() {
    el.configError.hidden = false;
    el.loginPanel.hidden = true;
    el.appPanel.hidden = true;
  }

  function renderAuth(user) {
    el.authZone.innerHTML = "";
    if (!user) return;
    var span = document.createElement("span");
    span.className = "admin-header__user";
    span.textContent = user.email || "";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--sm";
    btn.textContent = "Sair";
    btn.addEventListener("click", async function () {
      await client.auth.signOut();
      location.reload();
    });
    el.authZone.appendChild(span);
    el.authZone.appendChild(btn);
  }

  async function loadServices() {
    var res = await client
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  function renderTable(rows) {
    if (!rows.length) {
      el.tableWrap.innerHTML =
        "<p class=\"panel__hint\">Nenhum serviço. Clique em «Novo serviço».</p>";
      return;
    }
    var html =
      "<table class=\"data-table\"><thead><tr>" +
      "<th>Título</th><th>Slug</th><th>Ordem</th><th></th>" +
      "</tr></thead><tbody>";
    rows.forEach(function (r) {
      html +=
        "<tr data-id=\"" +
        r.id +
        "\">" +
        "<td>" +
        escapeHtml(r.title) +
        "</td>" +
        "<td><code>" +
        escapeHtml(r.slug) +
        "</code></td>" +
        "<td>" +
        String(r.sort_order) +
        "</td>" +
        "<td>" +
        "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-act=\"img\" data-id=\"" +
        r.id +
        "\" data-title=\"" +
        escapeAttr(r.title) +
        "\">Imagens</button> " +
        "<button type=\"button\" class=\"btn btn--ghost btn--sm\" data-act=\"edit\" data-id=\"" +
        r.id +
        "\">Editar</button> " +
        "<button type=\"button\" class=\"btn btn--danger btn--sm\" data-act=\"del\" data-id=\"" +
        r.id +
        "\">Apagar</button>" +
        "</td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    el.tableWrap.innerHTML = html;

    el.tableWrap.querySelectorAll("button[data-act]").forEach(function (btn) {
      btn.addEventListener("click", onTableAction);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  async function refreshTable() {
    var rows = await loadServices();
    renderTable(rows);
  }

  async function onTableAction(ev) {
    var btn = ev.currentTarget;
    var act = btn.getAttribute("data-act");
    var id = btn.getAttribute("data-id");
    if (act === "edit") {
      var res = await client.from("services").select("*").eq("id", id).single();
      if (res.error) {
        alert(res.error.message);
        return;
      }
      openServiceDialog(res.data);
    } else if (act === "del") {
      if (!confirm("Apagar este serviço e todas as imagens na base de dados?")) {
        return;
      }
      var imgs = await client.from("service_images").select("storage_path").eq("service_id", id);
      if (imgs.data && imgs.data.length) {
        var paths = imgs.data.map(function (x) {
          return x.storage_path;
        });
        await client.storage.from("service-images").remove(paths);
      }
      var d = await client.from("services").delete().eq("id", id);
      if (d.error) {
        alert(d.error.message);
        return;
      }
      await refreshTable();
    } else if (act === "img") {
      var title = btn.getAttribute("data-title") || "";
      openImagesDialog(id, title);
    }
  }

  function openServiceDialog(row) {
    el.svcFormError.hidden = true;
    document.getElementById("dlg-service-title").textContent = row
      ? "Editar serviço"
      : "Novo serviço";
    document.getElementById("svc-id").value = row ? row.id : "";
    document.getElementById("svc-title").value = row ? row.title : "";
    document.getElementById("svc-slug").value = row ? row.slug : "";
    document.getElementById("svc-order").value =
      row && row.sort_order != null ? String(row.sort_order) : "0";
    document.getElementById("svc-desc").value = row ? row.description || "" : "";
    el.dlgService.showModal();
  }

  document.getElementById("svc-title").addEventListener("blur", function () {
    var id = document.getElementById("svc-id").value;
    var slug = document.getElementById("svc-slug");
    if (!id && !slug.value.trim()) {
      slug.value = slugify(document.getElementById("svc-title").value);
    }
  });

  el.svcCancel.addEventListener("click", function () {
    el.dlgService.close();
  });

  el.formService.addEventListener("submit", async function (e) {
    e.preventDefault();
    el.svcFormError.hidden = true;
    var id = document.getElementById("svc-id").value.trim();
    var payload = {
      title: document.getElementById("svc-title").value.trim(),
      slug: document.getElementById("svc-slug").value.trim(),
      description: document.getElementById("svc-desc").value.trim(),
      sort_order: parseInt(document.getElementById("svc-order").value, 10) || 0,
    };
    if (!payload.slug) {
      payload.slug = slugify(payload.title);
    }
    var res;
    if (id) {
      res = await client.from("services").update(payload).eq("id", id);
    } else {
      res = await client.from("services").insert(payload);
    }
    if (res.error) {
      el.svcFormError.textContent = res.error.message;
      el.svcFormError.hidden = false;
      return;
    }
    el.dlgService.close();
    await refreshTable();
  });

  el.btnNew.addEventListener("click", function () {
    openServiceDialog(null);
  });

  async function openImagesDialog(serviceId, title) {
    el.imgServiceId.value = serviceId;
    el.dlgImagesTitle.textContent = "Imagens — " + title;
    el.imgStatus.textContent = "";
    el.imgFiles.value = "";
    el.imgList.innerHTML = "";
    el.dlgImages.showModal();
    await refreshImageList(serviceId);
  }

  el.btnCloseImages.addEventListener("click", function () {
    el.dlgImages.close();
  });

  if (el.imgFilesTrigger && el.imgFiles) {
    el.imgFilesTrigger.addEventListener("click", function () {
      el.imgFiles.click();
    });
  }

  async function refreshImageList(serviceId) {
    var res = await client
      .from("service_images")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order", { ascending: true });
    if (res.error) {
      el.imgStatus.textContent = res.error.message;
      return;
    }
    el.imgList.innerHTML = "";
    (res.data || []).forEach(function (img) {
      var li = document.createElement("li");
      li.className = "img-list__item";

      var thumb = document.createElement("img");
      thumb.className = "img-list__thumb";
      thumb.src = publicUrl(img.storage_path);
      thumb.alt = "";

      var path = document.createElement("span");
      path.className = "img-list__path";
      var full = String(img.storage_path || "");
      var base = full.split("/").filter(Boolean).pop() || full;
      path.textContent = base;
      path.title = full;

      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn--danger btn--sm";
      del.textContent = "Remover";
      del.addEventListener("click", async function () {
        await client.storage.from("service-images").remove([img.storage_path]);
        await client.from("service_images").delete().eq("id", img.id);
        await refreshImageList(serviceId);
      });

      li.appendChild(thumb);
      li.appendChild(path);
      li.appendChild(del);
      el.imgList.appendChild(li);
    });
  }

  el.imgFiles.addEventListener("change", async function () {
    var serviceId = el.imgServiceId.value;
    var files = el.imgFiles.files;
    if (!files || !files.length) return;
    el.imgStatus.textContent = "A enviar…";

    var existing = await client
      .from("service_images")
      .select("sort_order")
      .eq("service_id", serviceId)
      .order("sort_order", { ascending: false })
      .limit(1);
    var start =
      existing.data && existing.data.length
        ? (existing.data[0].sort_order || 0) + 1
        : 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var path = serviceId + "/" + Date.now() + "_" + i + "_" + safeName;
      var up = await client.storage.from("service-images").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (up.error) {
        el.imgStatus.textContent = up.error.message;
        return;
      }
      var ins = await client.from("service_images").insert({
        service_id: serviceId,
        storage_path: path,
        sort_order: start + i,
        alt_text: "",
      });
      if (ins.error) {
        el.imgStatus.textContent = ins.error.message;
        return;
      }
    }
    el.imgFiles.value = "";
    el.imgStatus.textContent = "Envio concluído.";
    await refreshImageList(serviceId);
  });

  el.formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();
    el.loginError.hidden = true;
    var fd = new FormData(el.formLogin);
    var email = String(fd.get("email") || "").trim();
    var password = String(fd.get("password") || "");
    var res = await client.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      el.loginError.textContent = res.error.message;
      el.loginError.hidden = false;
      return;
    }
    el.loginPanel.hidden = true;
    el.appPanel.hidden = false;
    renderAuth(res.data.user);
    await refreshTable();
  });

  async function init() {
    if (!hasConfig()) {
      showConfigError();
      return;
    }
    if (!globalThis.supabase || !globalThis.supabase.createClient) {
      showConfigError();
      return;
    }
    client = globalThis.supabase.createClient(cfg.url, cfg.anonKey);
    var session = await client.auth.getSession();
    if (session.data.session) {
      el.loginPanel.hidden = true;
      el.appPanel.hidden = false;
      renderAuth(session.data.session.user);
      await refreshTable();
    } else {
      el.loginPanel.hidden = false;
      el.appPanel.hidden = true;
    }
  }

  init();
})();
