/* ===== 移動シミュレーター 行程カゴ（共通部品） =====
   各シミュレーターの表示済み合計を localStorage（同じドメイン内）へ積み、
   トップページで総合計と割り勘を出すための小さな追加部品。
   計算エンジンには一切触らない。 */
(function () {
  "use strict";
  var KEY = "ido_itinerary_v1";
  var CFG = window.IDO_BASKET || { kind: "portal" };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
  }
  function yen(n) { return "¥" + Math.round(n).toLocaleString("ja-JP"); }
  function parseAmt(text) {
    if (!text) return null;
    var digits = String(text).replace(/[^0-9]/g, "");
    if (!digits) return null;
    var v = parseInt(digits, 10);
    return isNaN(v) ? null : v;
  }
  function elText(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.trim() : "";
  }
  function extract() {
    if (CFG.kind === "timescar") {
      var a = parseAmt(elText("totalAmount"));
      if (a === null) return null;
      var plan = elText("planName");
      return { kind: "timescar", label: "タイムズカー" + (plan && plan !== "—" ? "（" + plan + "）" : ""), amount: a, unit: "台分" };
    }
    if (CFG.kind === "highway") {
      var h = parseAmt(elText("stickyMainPrice"));
      if (h === null) return null;
      var route = elText("stickyRoute");
      var cap = elText("stickyMainCap");
      return { kind: "highway", label: "高速 " + (route && route !== "—" ? route : "") + (cap ? "／" + cap : ""), amount: h, unit: "台分" };
    }
    if (CFG.kind === "train") {
      var bar = document.getElementById("farebar");
      if (!bar || bar.hidden) return null;
      var t = parseAmt(elText("fbTotal"));
      if (t === null) return null;
      var r = elText("fbRoute");
      return { kind: "train", label: "電車 " + (r && r !== "—" ? r : ""), amount: t, unit: "人分（人数はページ側で設定）" };
    }
    return null;
  }
  function total(items) {
    return items.reduce(function (s, it) { return s + it.amount * (it.qty || 1); }, 0);
  }

  /* --- 追加ボタン（シミュレーター各ページ） --- */
  if (CFG.kind !== "portal") {
    var box = document.createElement("div");
    box.id = "ido-basket-widget";
    box.style.cssText = "position:fixed;right:12px;bottom:92px;z-index:9999;background:#12283f;color:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 6px 20px rgba(0,0,0,.3);font-family:system-ui,-apple-system,sans-serif;font-size:13px;max-width:78vw;";
    box.innerHTML =
      '<div id="ido-basket-status" style="margin-bottom:8px;color:#cfe2f3;">行程カゴ：0件／¥0</div>' +
      '<button id="ido-basket-add" type="button" style="background:#f2a81d;color:#12283f;border:0;border-radius:8px;padding:8px 12px;font-weight:800;cursor:pointer;">＋ 行程に追加</button> ' +
      '<a href="/" style="color:#fff;text-decoration:underline;">カゴを見る</a>';
    document.body.appendChild(box);

    /* 同意ポップアップ表示中はカゴを隠す（ポップアップを確実に最前面にするため） */
    function syncWidgetVisibility() {
      var ov = document.querySelector(".pp-overlay");
      var open = ov && (ov.classList.contains("open") || window.getComputedStyle(ov).display !== "none");
      box.style.display = open ? "none" : "";
    }
    if (window.MutationObserver) {
      new MutationObserver(syncWidgetVisibility).observe(document.body, { attributes: true, attributeFilter: ["class", "style"], subtree: true });
    }
    setInterval(syncWidgetVisibility, 500);
    syncWidgetVisibility();

    var status = document.getElementById("ido-basket-status");
    function refresh() {
      var items = load();
      status.textContent = "行程カゴ：" + items.length + "件／" + yen(total(items));
    }
    refresh();
    window.addEventListener("storage", function (e) { if (e.key === KEY) refresh(); });

    document.getElementById("ido-basket-add").addEventListener("click", function () {
      var got = extract();
      if (!got) {
        alert("まだ料金が出ていません。先に条件を選んで料金を表示してから追加してください。");
        return;
      }
      var items = load();
      got.id = Date.now();
      got.qty = 1;
      items.push(got);
      save(items);
      refresh();
      status.textContent = "追加しました：" + got.label + " " + yen(got.amount);
    });
  }

  /* --- カゴ管理（トップページ） --- */
  var root = document.getElementById("ido-basket-root");
  if (root) {
    var persons = 2;
    function render() {
      var items = load();
      if (!items.length) {
        root.innerHTML = '<p style="color:#5b6b7c;line-height:1.8;margin:0;">まだ何も入っていません。各シミュレーターで料金を出して「＋ 行程に追加」を押すと、ここに積み上がって合計が出ます。</p>';
        return;
      }
      var html = "";
      items.forEach(function (it, i) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:10px 0;border-bottom:1px solid #e3e9ef;">' +
          '<span style="flex:1;min-width:180px;">' + escapeHtml(it.label) + '<br><small style="color:#5b6b7c;">単価 ' + yen(it.amount) + "／" + escapeHtml(it.unit || "") + "</small></span>" +
          '<span>× <button type="button" data-act="dec" data-i="' + i + '" style="padding:2px 9px;">−</button> ' + (it.qty || 1) +
          ' <button type="button" data-act="inc" data-i="' + i + '" style="padding:2px 9px;">＋</button></span>' +
          '<strong style="min-width:90px;text-align:right;">' + yen(it.amount * (it.qty || 1)) + "</strong>" +
          '<button type="button" data-act="del" data-i="' + i + '" style="padding:2px 9px;">削除</button></div>';
      });
      var sum = total(items);
      var per = Math.ceil(sum / Math.max(1, persons));
      html += '<div style="padding:14px 0 2px;font-size:16px;">総合計 <strong style="font-size:22px;">' + yen(sum) + "</strong></div>" +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#5b6b7c;">割り勘：' +
        '<input id="ido-persons" type="number" min="1" max="99" value="' + persons + '" style="width:64px;padding:6px;"> 人で割ると ' +
        "<strong style='color:#1c2733;'>1人あたり " + yen(per) + "</strong>（端数切り上げ）</div>" +
        '<div style="margin-top:10px;"><button type="button" id="ido-clear" style="padding:6px 12px;">カゴを空にする</button></div>';
      root.innerHTML = html;

      root.querySelectorAll("button[data-act]").forEach(function (b) {
        b.addEventListener("click", function () {
          var items2 = load();
          var i = parseInt(b.getAttribute("data-i"), 10);
          var act = b.getAttribute("data-act");
          if (act === "inc") items2[i].qty = (items2[i].qty || 1) + 1;
          if (act === "dec") items2[i].qty = Math.max(1, (items2[i].qty || 1) - 1);
          if (act === "del") items2.splice(i, 1);
          save(items2);
          render();
        });
      });
      var pin = document.getElementById("ido-persons");
      if (pin) pin.addEventListener("change", function () {
        persons = Math.max(1, parseInt(pin.value, 10) || 1);
        render();
      });
      var clr = document.getElementById("ido-clear");
      if (clr) clr.addEventListener("click", function () { save([]); render(); });
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    render();
    window.addEventListener("storage", function (e) { if (e.key === KEY) render(); });
  }
})();
