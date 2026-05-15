(function () {
  var btn = document.getElementById("services-pdf-btn");
  if (!btn) {
    return;
  }

  var LOGO_PATH = "assets/Pavitek_horizontal.png";

  var PDF_INTRO_COVER =
    "Serviços e imagens conforme o cadastro no site. Para propostas comerciais, contacte a Pavitek.";

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

  function fetchDataUrl(url) {
    return fetch(url, { mode: "cors", credentials: "omit" }).then(function (r) {
      if (!r.ok) {
        throw new Error("HTTP " + r.status);
      }
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onloadend = function () {
          resolve(fr.result);
        };
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    });
  }

  function imageDimensions(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function rasterToJpegDataUrl(dataUrl, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          var maxSide = 1600;
          var w = img.naturalWidth;
          var h = img.naturalHeight;
          if (w > maxSide || h > maxSide) {
            var s = maxSide / Math.max(w, h);
            w = Math.round(w * s);
            h = Math.round(h * s);
          }
          var c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          var ctx = c.getContext("2d");
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", quality || 0.86));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = function () {
        reject(new Error("imagem"));
      };
      img.src = dataUrl;
    });
  }

  function drawFooters(doc) {
    var n = doc.internal.getNumberOfPages();
    var when = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    var i;
    for (i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Pavitek LTDA  ·  " + when, 16, 287);
      doc.text(String(i) + " / " + n, 194, 287, { align: "right" });
    }
  }

  function drawPageFrame(doc) {
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.35);
    doc.rect(12, 12, 186, 273);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.6);
    doc.line(12, 12, 40, 12);
  }

  btn.addEventListener("click", function () {
    var JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) {
      alert("Biblioteca PDF não carregou. Verifique a ligação à internet.");
      return;
    }

    var cfg = globalThis.PAVITEK_SUPABASE;
    if (
      !cfg ||
      !cfg.url ||
      !cfg.anonKey ||
      String(cfg.anonKey).trim().length < 20
    ) {
      alert("Configure config/supabase.public.js para gerar o PDF com os serviços.");
      return;
    }
    if (!globalThis.supabase || !globalThis.supabase.createClient) {
      alert("Supabase não está disponível.");
      return;
    }

    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    var label = btn.textContent;
    btn.textContent = "…";

    var client = globalThis.supabase.createClient(cfg.url, cfg.anonKey);

    Promise.all([
      client
        .from("services")
        .select("id,title,slug,description,sort_order")
        .order("sort_order", { ascending: true }),
      client
        .from("service_images")
        .select("id,service_id,storage_path,sort_order")
        .order("sort_order", { ascending: true }),
      fetchDataUrl(new URL(LOGO_PATH, globalThis.location.href).href).catch(
        function () {
          return null;
        },
      ),
    ])
      .then(function (results) {
        var sRes = results[0];
        var iRes = results[1];
        var logoUrl = results[2];
        if (sRes.error) {
          throw sRes.error;
        }
        if (iRes.error) {
          throw iRes.error;
        }
        var services = sRes.data || [];
        var bySvc = {};
        (iRes.data || []).forEach(function (row) {
          if (!bySvc[row.service_id]) {
            bySvc[row.service_id] = [];
          }
          bySvc[row.service_id].push(row);
        });

        var doc = new JsPDF({
          orientation: "p",
          unit: "mm",
          format: "a4",
          compress: true,
        });

        var pageW = 210;
        var pageH = 297;
        var margin = 16;
        var contentW = pageW - 2 * margin;
        var y = 0;

        doc.setFillColor(2, 6, 23);
        doc.rect(0, 0, pageW, pageH, "F");
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(10, 10, 190, 277, 2, 2, "F");

        var logoPromise = logoUrl
          ? imageDimensions(logoUrl).then(function (dim) {
              var lw = 44;
              var lh = (lw / dim.w) * dim.h;
              var lx = (pageW - lw) / 2;
              doc.addImage(logoUrl, "PNG", lx, 14, lw, lh);
              return lh;
            })
          : Promise.resolve(0);

        return logoPromise.then(function (logoH) {
          function fileName() {
            var d = new Date();
            var pad = function (n) {
              return String(n).padStart(2, "0");
            };
            return (
              "pavitek-servicos-" +
              d.getFullYear() +
              "-" +
              pad(d.getMonth() + 1) +
              "-" +
              pad(d.getDate()) +
              ".pdf"
            );
          }

          var titleY = 18 + (logoH || 0) + 8;
          doc.setTextColor(241, 245, 249);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(17);
          doc.text("Catálogo de serviços", pageW / 2, titleY, {
            align: "center",
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            "Pavitek LTDA — rodovias e ferrovias",
            pageW / 2,
            titleY + 6,
            { align: "center" },
          );
          var accentLineY = titleY + 10;
          doc.setFillColor(245, 158, 11);
          doc.rect(28, accentLineY, pageW - 56, 0.65, "F");

          var coverIntroY = accentLineY + 3.2;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.splitTextToSize(PDF_INTRO_COVER, pageW - 56).forEach(function (line) {
            doc.text(line, pageW / 2, coverIntroY, { align: "center" });
            coverIntroY += 3.3;
          });

          function paintContentPageBg() {
            doc.setFillColor(2, 6, 23);
            doc.rect(0, 0, pageW, pageH, "F");
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(10, 10, 190, 277, 2, 2, "F");
          }

          drawPageFrame(doc);
          y = coverIntroY + 5;

          if (!services.length) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.setTextColor(148, 163, 184);
            doc.text("Nenhum serviço cadastrado.", margin, y);
            drawFooters(doc);
            doc.save(fileName());
            return;
          }

          function newContentPage() {
            doc.addPage();
            paintContentPageBg();
            drawPageFrame(doc);
            y = 16;
          }

          function ensureSpace(mm) {
            if (y + mm > pageH - margin - 12) {
              newContentPage();
            }
          }

          var chain = Promise.resolve();

          services.forEach(function (svc, si) {
            chain = chain.then(function () {
              if (si > 0) {
                ensureSpace(10);
                doc.setDrawColor(51, 65, 85);
                doc.setLineWidth(0.12);
                doc.line(margin, y, pageW - margin, y);
                y += 4;
              }
              ensureSpace(14);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(11.5);
              doc.setTextColor(245, 158, 11);
              doc.text(String(si + 1) + ". " + svc.title, margin, y);
              y += 5;
              doc.setFont("helvetica", "italic");
              doc.setFontSize(7.5);
              doc.setTextColor(100, 116, 139);
              var slugLine =
                "Referência: " + String(svc.slug || "").slice(0, 72);
              doc.text(slugLine, margin, y);
              y += 4;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9.5);
              doc.setTextColor(203, 213, 225);
              var desc = String(svc.description || "").trim() || "—";
              var lines = doc.splitTextToSize(desc, contentW);
              lines.forEach(function (line) {
                ensureSpace(4.5);
                doc.text(line, margin, y);
                y += 3.9;
              });
              y += 2;

              var imgs = bySvc[svc.id] || [];
              imgs.sort(function (a, b) {
                return (a.sort_order || 0) - (b.sort_order || 0);
              });

              if (!imgs.length) {
                return Promise.resolve();
              }

              function loadPhoto(imgRow) {
                var url = publicImageUrl(cfg.url, imgRow.storage_path);
                return fetchDataUrl(url)
                  .then(function (du) {
                    return rasterToJpegDataUrl(du, 0.82).catch(function () {
                      return du;
                    });
                  })
                  .then(function (du) {
                    return imageDimensions(du).then(function (dim) {
                      return { ok: true, du: du, dim: dim };
                    });
                  })
                  .catch(function () {
                    return { ok: false, du: null, dim: null };
                  });
              }

              return Promise.all(imgs.map(loadPhoto)).then(function (slots) {
                var colGap = 3.5;
                var cellW = (contentW - colGap) / 2;
                var cellHMax = 44;

                function fitCell(dim, maxW, maxH) {
                  var rw = maxW / dim.w;
                  var rh = maxH / dim.h;
                  var scale = Math.min(rw, rh);
                  return {
                    w: dim.w * scale,
                    h: dim.h * scale,
                  };
                }

                function drawMissing(x, yy, wCell) {
                  doc.setFont("helvetica", "italic");
                  doc.setFontSize(7.5);
                  doc.setTextColor(100, 116, 139);
                  doc.text("Indisponível", x + wCell / 2, yy + 8, {
                    align: "center",
                  });
                  doc.setFont("helvetica", "normal");
                }

                var i = 0;
                while (i < slots.length) {
                  var rest = slots.length - i;
                  if (rest === 1) {
                    var s0 = slots[i];
                    var maxW = contentW;
                    var maxH = 50;
                    if (s0.ok) {
                      var f0 = fitCell(s0.dim, maxW, maxH);
                      ensureSpace(f0.h + 3);
                      var x0 = margin + (contentW - f0.w) / 2;
                      doc.addImage(s0.du, "JPEG", x0, y, f0.w, f0.h);
                      y += f0.h + 3;
                    } else {
                      ensureSpace(14);
                      drawMissing(margin, y, contentW);
                      y += 14;
                    }
                    i += 1;
                  } else {
                    var sa = slots[i];
                    var sb = slots[i + 1];
                    var ha = 0;
                    var wa = 0;
                    var hb = 0;
                    var wb = 0;
                    if (sa.ok) {
                      var fa = fitCell(sa.dim, cellW, cellHMax);
                      wa = fa.w;
                      ha = fa.h;
                    } else {
                      wa = cellW;
                      ha = 12;
                    }
                    if (sb.ok) {
                      var fb = fitCell(sb.dim, cellW, cellHMax);
                      wb = fb.w;
                      hb = fb.h;
                    } else {
                      wb = cellW;
                      hb = 12;
                    }
                    var hRow = Math.max(ha, hb);
                    ensureSpace(hRow + 3);
                    var xa = margin;
                    var xb = margin + cellW + colGap;
                    if (sa.ok) {
                      doc.addImage(sa.du, "JPEG", xa, y, wa, ha);
                    } else {
                      drawMissing(xa, y, cellW);
                    }
                    if (sb.ok) {
                      doc.addImage(sb.du, "JPEG", xb, y, wb, hb);
                    } else {
                      drawMissing(xb, y, cellW);
                    }
                    y += hRow + 3;
                    i += 2;
                  }
                }
              });
            });
          });

          return chain.then(function () {
            drawFooters(doc);
            doc.save(fileName());
          });
        });
      })
      .catch(function (err) {
        alert(
          err && err.message
            ? "Não foi possível gerar o PDF: " + err.message
            : "Não foi possível gerar o PDF.",
        );
      })
      .finally(function () {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        btn.textContent = label;
      });
  });
})();
