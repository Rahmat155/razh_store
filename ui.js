/* RAZH STORE ui.js — lapisan UI bersama untuk index.html dan admin.html.
   Menyediakan: toast, dialog konfirmasi/pemberitahuan, tombol loading, efek getar.
   Tidak bergantung pada Firebase. Mengikuti prefers-reduced-motion. */
(function () {
  "use strict";
  if (window.RazhUI) return;

  var CSS = [
    ".rz-toasts{position:fixed;z-index:20000;left:0;right:0;top:calc(10px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 12px;pointer-events:none}",
    ".rz-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;width:min(100%,420px);background:#fff;color:#183d61;border:1px solid #d5eafa;border-left:4px solid var(--rz-c,#1676d2);border-radius:14px;padding:11px 12px;box-shadow:0 10px 28px #0a254026;font:600 13px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;animation:rzIn .26s cubic-bezier(.2,.8,.2,1) both;cursor:pointer}",
    ".rz-toast.out{animation:rzOut .2s ease both}",
    ".rz-toast .rz-ico{flex:0 0 20px;width:20px;height:20px;margin-top:1px;color:var(--rz-c,#1676d2)}",
    ".rz-toast .rz-body{flex:1;min-width:0;overflow-wrap:anywhere}",
    ".rz-toast .rz-title{display:block;font-weight:800;color:#10477f}",
    ".rz-toast .rz-x{flex:0 0 auto;border:0;background:transparent;color:#718da7;font-size:18px;line-height:1;padding:0 2px;min-height:0;cursor:pointer}",
    ".rz-toast.success{--rz-c:#1f9d57}.rz-toast.error{--rz-c:#d64545}.rz-toast.warning{--rz-c:#d98a00}.rz-toast.info{--rz-c:#1676d2}",
    ".rz-toast.success .rz-ico{animation:rzPop .4s cubic-bezier(.2,1.4,.4,1) .08s both}",
    "@media(min-width:900px){.rz-toasts{top:auto;bottom:calc(20px + env(safe-area-inset-bottom,0px));align-items:flex-end;padding:0 20px;flex-direction:column-reverse}}",
    "@keyframes rzIn{from{opacity:0;transform:translateY(-12px) scale(.98)}to{opacity:1;transform:none}}",
    "@keyframes rzOut{to{opacity:0;transform:translateY(-8px) scale(.98)}}",
    "@keyframes rzPop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}",
    ".rz-dlg-back{position:fixed;inset:0;z-index:20010;background:#09233d99;display:flex;align-items:center;justify-content:center;padding:16px;animation:rzFade .18s ease both}",
    ".rz-dlg-back.out{animation:rzFadeOut .16s ease both}",
    ".rz-dlg{width:min(100%,400px);background:#fff;color:#183d61;border-radius:20px;padding:20px 18px 16px;box-shadow:0 24px 60px #0a254040;font:500 14px/1.55 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;animation:rzDlg .24s cubic-bezier(.2,.9,.25,1) both}",
    ".rz-dlg-back.out .rz-dlg{animation:rzDlgOut .16s ease both}",
    ".rz-dlg h2{margin:0 0 6px;font-size:17px;font-weight:800;color:#10477f}",
    ".rz-dlg p{margin:0;color:#4d6c88;overflow-wrap:anywhere;white-space:pre-line}",
    ".rz-dlg .rz-actions{display:flex;gap:10px;margin-top:18px}",
    ".rz-dlg .rz-actions button{flex:1;min-height:46px;border-radius:12px;border:1px solid #b9d9f2;background:#fff;color:#1267b2;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;transition:transform .12s,background .15s}",
    ".rz-dlg .rz-actions button:active{transform:scale(.97)}",
    ".rz-dlg .rz-actions .rz-ok{background:#1676d2;border-color:#1676d2;color:#fff}",
    ".rz-dlg.danger .rz-actions .rz-ok{background:#d64545;border-color:#d64545}",
    ".rz-dlg button:focus-visible{outline:3px solid #80c5f5;outline-offset:2px}",
    "@keyframes rzFade{from{opacity:0}to{opacity:1}}@keyframes rzFadeOut{to{opacity:0}}",
    "@keyframes rzDlg{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}",
    "@keyframes rzDlgOut{to{opacity:0;transform:translateY(10px) scale(.98)}}",
    "@media(max-width:560px){.rz-dlg-back{align-items:flex-end;padding:0}.rz-dlg{width:100%;border-radius:22px 22px 0 0;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}@keyframes rzDlg{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}}",
    ".rz-busy{position:relative;pointer-events:none}",
    ".rz-busy .rz-spin{display:inline-block;width:14px;height:14px;margin-right:8px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:rzSpin .7s linear infinite;vertical-align:-2px}",
    "button.rz-busy:disabled:before{display:none!important}",
    "@keyframes rzSpin{to{transform:rotate(360deg)}}",
    ".rz-shake{animation:rzShake .36s ease both}",
    "@keyframes rzShake{15%{transform:translateX(-6px)}35%{transform:translateX(5px)}55%{transform:translateX(-4px)}75%{transform:translateX(2px)}}",
    "@media(prefers-reduced-motion:reduce){.rz-toast,.rz-toast.out,.rz-dlg,.rz-dlg-back,.rz-dlg-back.out,.rz-dlg-back.out .rz-dlg,.rz-toast .rz-ico,.rz-shake{animation-duration:.01ms!important}.rz-busy .rz-spin{animation-duration:1.6s}}"
  ].join("\n");

  var style = document.createElement("style");
  style.id = "rz-ui-css";
  style.textContent = CSS;
  document.head.appendChild(style);

  var ICONS = {
    success: '<svg class="rz-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="m7.8 12.4 2.8 2.8 5.6-5.8"/></svg>',
    error: '<svg class="rz-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5.5M12 16.4v.1"/></svg>',
    warning: '<svg class="rz-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6 21.5 20H2.5z"/><path d="M12 10v4.4M12 17.2v.1"/></svg>',
    info: '<svg class="rz-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.4M12 7.6v.1"/></svg>'
  };

  var reduced = function () { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; };
  var stack = null;

  function ensureStack() {
    if (stack && document.body.contains(stack)) return stack;
    stack = document.createElement("div");
    stack.className = "rz-toasts";
    document.body.appendChild(stack);
    return stack;
  }

  function dismiss(el) {
    if (!el || el._gone) return;
    el._gone = true;
    clearTimeout(el._t);
    el.classList.add("out");
    setTimeout(function () { el.remove(); }, reduced() ? 0 : 200);
  }

  /* toast(message, {type, title, duration}) — type: success | error | warning | info */
  function toast(message, opts) {
    opts = opts || {};
    var type = ICONS[opts.type] ? opts.type : "info";
    var root = ensureStack();
    // Pesan identik yang masih tampil tidak ditumpuk.
    var dup = Array.prototype.find.call(root.children, function (c) { return c._key === type + "|" + message && !c._gone; });
    if (dup) { dup.classList.remove("rz-shake"); void dup.offsetWidth; dup.classList.add("rz-shake"); clearTimeout(dup._t); dup._t = setTimeout(function () { dismiss(dup); }, 3500); return dup; }
    var el = document.createElement("div");
    el.className = "rz-toast " + type;
    el._key = type + "|" + message;
    el.setAttribute("role", type === "error" || type === "warning" ? "alert" : "status");
    el.innerHTML = ICONS[type] + '<div class="rz-body"></div><button type="button" class="rz-x" aria-label="Tutup notifikasi">×</button>';
    var body = el.querySelector(".rz-body");
    if (opts.title) { var t = document.createElement("span"); t.className = "rz-title"; t.textContent = opts.title; body.appendChild(t); }
    body.appendChild(document.createTextNode(String(message == null ? "" : message)));
    el.addEventListener("click", function () { dismiss(el); });
    root.appendChild(el);
    var live = Array.prototype.filter.call(root.children, function (c) { return !c._gone; });
    for (var i = 0; live.length - i > 3; i++) dismiss(live[i]);
    var ms = opts.duration != null ? opts.duration : (type === "error" ? 6000 : type === "warning" ? 5000 : 3200);
    if (ms > 0) el._t = setTimeout(function () { dismiss(el); }, ms);
    return el;
  }

  var openDialogs = 0;

  function dialog(o) {
    return new Promise(function (resolve) {
      var prevFocus = document.activeElement;
      var back = document.createElement("div");
      back.className = "rz-dlg-back";
      var box = document.createElement("div");
      box.className = "rz-dlg" + (o.danger ? " danger" : "");
      box.setAttribute("role", o.cancelText === false ? "alertdialog" : "dialog");
      box.setAttribute("aria-modal", "true");
      var h = document.createElement("h2"); h.textContent = o.title || "Konfirmasi"; h.id = "rzdt" + Date.now();
      var p = document.createElement("p"); p.textContent = o.message || ""; p.id = "rzdm" + Date.now();
      box.setAttribute("aria-labelledby", h.id); box.setAttribute("aria-describedby", p.id);
      var actions = document.createElement("div"); actions.className = "rz-actions";
      var cancel = null;
      if (o.cancelText !== false) { cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = o.cancelText || "Batal"; actions.appendChild(cancel); }
      var ok = document.createElement("button"); ok.type = "button"; ok.className = "rz-ok"; ok.textContent = o.confirmText || "Lanjutkan"; actions.appendChild(ok);
      box.appendChild(h); box.appendChild(p); box.appendChild(actions); back.appendChild(box);
      document.body.appendChild(back);
      openDialogs++;
      var prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      var closed = false;
      function close(val) {
        if (closed) return; closed = true;
        document.removeEventListener("keydown", onKey, true);
        back.classList.add("out");
        setTimeout(function () {
          back.remove(); openDialogs--;
          if (!openDialogs) document.body.style.overflow = prevOverflow;
          if (prevFocus && prevFocus.focus && document.contains(prevFocus)) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { } }
          resolve(val);
        }, reduced() ? 0 : 160);
      }
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); }
        else if (e.key === "Tab") {
          var f = box.querySelectorAll("button"); if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener("keydown", onKey, true);
      ok.addEventListener("click", function () { close(true); });
      if (cancel) cancel.addEventListener("click", function () { close(false); });
      back.addEventListener("mousedown", function (e) { if (e.target === back && cancel) close(false); });
      // Tindakan berbahaya: fokus awal di "Batal" agar Enter tidak menghapus tanpa sengaja.
      setTimeout(function () { (o.danger && cancel ? cancel : ok).focus(); }, 30);
    });
  }

  function confirmDialog(o) { return dialog(typeof o === "string" ? { message: o } : o); }
  function alertDialog(o) {
    o = typeof o === "string" ? { message: o } : o;
    return dialog(Object.assign({ title: "Pemberitahuan", confirmText: "Mengerti", cancelText: false }, o)).then(function () { return true; });
  }

  /* busy(button, label) -> fungsi pemulih. Tombol dinonaktifkan + spinner + aria-busy. */
  function busy(btn, label) {
    if (!btn) return function () { };
    if (btn._rzBusy) return btn._rzBusy;
    var old = btn.innerHTML, w = btn.offsetWidth;
    btn._rzOldDisabled = btn.disabled;
    btn.style.minWidth = w ? w + "px" : "";
    btn.disabled = true;
    btn.classList.add("rz-busy");
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = '<span class="rz-spin" aria-hidden="true"></span>' + (label ? String(label).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) : "");
    var restore = function () {
      btn.innerHTML = old; btn.style.minWidth = "";
      btn.disabled = btn._rzOldDisabled || false;
      btn.classList.remove("rz-busy"); btn.removeAttribute("aria-busy");
      btn._rzBusy = null;
    };
    btn._rzBusy = restore;
    return restore;
  }

  function shake(el) {
    if (!el) return;
    el.classList.remove("rz-shake"); void el.offsetWidth; el.classList.add("rz-shake");
    setTimeout(function () { el.classList.remove("rz-shake"); }, 420);
  }

  window.RazhUI = { toast: toast, confirm: confirmDialog, alert: alertDialog, busy: busy, shake: shake };
})();
