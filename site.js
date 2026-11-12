(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll(".copy-slide"));
  var reel = document.getElementById("reel");
  var tabs = document.getElementById("tabs");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var index = 0;
  var timer = null;
  var paused = false;
  var ignoreScroll = false;
  var unlockTimer = null;

  slides.forEach(function (slide, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = slide.getAttribute("data-name");
    b.setAttribute("role", "tab");
    b.id = "tab-" + slide.getAttribute("data-slide");
    b.setAttribute("aria-controls", "panel");
    b.addEventListener("mousedown", function (e) { e.preventDefault(); });
    b.addEventListener("click", function () {
      go(i, true);
      b.focus({ preventScroll: true });
    });
    tabs.appendChild(b);
  });

  function slideWidth() { return reel.clientWidth || 1; }

  function sizeSlides() {
    var w = reel.clientWidth;
    if (!w) return;
    Array.prototype.forEach.call(reel.children, function (el) {
      el.style.flex = "0 0 " + w + "px";
      el.style.width = w + "px";
    });
  }

  function render(i) {
    slides.forEach(function (slide, n) {
      var on = n === i;
      slide.classList.toggle("is-on", on);
      slide.setAttribute("aria-hidden", on ? "false" : "true");
    });
    Array.prototype.forEach.call(tabs.children, function (b, n) {
      var on = n === i;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    var id = slides[i].getAttribute("data-slide");
    if ((location.hash || "").replace("#", "") !== id) {
      history.replaceState(null, "", "#" + id);
    }
  }

  function moveReel(i, behavior) {
    sizeSlides();
    programmatic = true;
    ignoreScroll = true;
    if (unlockTimer) { clearTimeout(unlockTimer); unlockTimer = null; }
    var behaviorName = behavior || "auto";
    reel.scrollTo({ left: i * slideWidth(), top: 0, behavior: behaviorName });
    var unlock = function () {
      ignoreScroll = true;
      reel.scrollLeft = index * slideWidth();
      programmatic = false;
      render(index);
      unlockTimer = setTimeout(function () { ignoreScroll = false; unlockTimer = null; }, 60);
    };
    if (behaviorName === "smooth") unlockTimer = setTimeout(unlock, 520);
    else unlock();
  }

  function go(i, user) {
    index = (i + slides.length) % slides.length;
    moveReel(index, reduce ? "auto" : "smooth");
    render(index);
    if (user) pause();
    if (!dialog.hidden) {
      dialog.setAttribute("aria-label", "Förstorad skärmbild: " + slides[index].getAttribute("data-name"));
      if (!fromLightbox) placeLightbox(reduce || !user ? "auto" : "smooth");
    }
  }

  function nearest() {
    return Math.max(0, Math.min(slides.length - 1, Math.round(reel.scrollLeft / slideWidth())));
  }

  var programmatic = false;
  var scrollTimer = null;
  var dialog = document.getElementById("lightbox");
  var lbReel = document.getElementById("lightbox-reel");
  var fromLightbox = false;
  var lbJump = false;
  var opener = null;
  var lockedY = 0;

  function showFromReel(i) {
    if (i < 0 || i === index) return;
    index = i;
    render(i);
  }

  function syncFromScroll() {
    if (programmatic) return;
    showFromReel(nearest());
  }

  reel.addEventListener("scroll", function () {
    if (programmatic) return;
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(syncFromScroll, 80);
  }, { passive: true });

  reel.addEventListener("scrollend", function () {
    if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null; }
    if (programmatic) {
      programmatic = false;
      render(index);
      return;
    }
    syncFromScroll();
  });

  function arm(el, fn) {
    el.addEventListener("mousedown", function (e) { e.preventDefault(); });
    el.addEventListener("click", function () {
      fn();
      el.focus({ preventScroll: true });
    });
  }
  arm(document.getElementById("prev"), function () { go(index - 1, true); });
  arm(document.getElementById("next"), function () { go(index + 1, true); });

  document.querySelector(".showcase").addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, true); }
  });

  function pause() {
    paused = true;
    if (timer) { clearInterval(timer); timer = null; }
  }

  ["pointerdown", "focusin", "mouseenter"].forEach(function (ev) {
    document.querySelector(".showcase").addEventListener(ev, pause);
  });

  if (!reduce) {
    timer = setInterval(function () {
      if (paused || document.hidden) return;
      go(index + 1, false);
    }, 7000);
  }

  var start = 0;
  var asked = new URLSearchParams(location.search).get("slide") || (location.hash || "").replace("#", "");
  slides.forEach(function (slide, i) {
    if (slide.getAttribute("data-slide") === asked) start = i;
  });
  index = start;
  render(start);
  moveReel(start, "auto");
  window.addEventListener("load", function () { moveReel(index, "auto"); });
  window.addEventListener("resize", function () {
    moveReel(index, "auto");
    if (!dialog.hidden) fitLightbox();
  });

  function lbWidth() { return lbReel.clientWidth || 1; }

  function sizeLightbox() {
    var w = lbReel.clientWidth;
    if (!w) return;
    Array.prototype.forEach.call(lbReel.children, function (el) {
      el.style.flex = "0 0 " + w + "px";
      el.style.width = w + "px";
    });
  }

  function placeLightbox(behavior) {
    if (dialog.hidden) return;
    sizeLightbox();
    lbJump = true;
    var behaviorName = behavior || "auto";
    lbReel.scrollTo({ left: index * lbWidth(), top: 0, behavior: behaviorName });
    setTimeout(function () { lbJump = false; }, behaviorName === "smooth" ? 520 : 80);
  }

  function lightboxIndex() {
    return Math.max(0, Math.min(slides.length - 1, Math.round(lbReel.scrollLeft / lbWidth())));
  }

  function onLightboxScroll() {
    if (lbJump || dialog.hidden) return;
    var i = lightboxIndex();
    if (i === index) return;
    fromLightbox = true;
    go(i, true);
    fromLightbox = false;
  }

  var lbTimer = null;
  lbReel.addEventListener("scroll", function () {
    if (lbJump) return;
    if (lbTimer) clearTimeout(lbTimer);
    lbTimer = setTimeout(onLightboxScroll, 80);
  }, { passive: true });
  lbReel.addEventListener("scrollend", function () {
    if (lbTimer) { clearTimeout(lbTimer); lbTimer = null; }
    onLightboxScroll();
  });

  function setInert(on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === dialog) return;
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function lockScroll() {
    lockedY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = "-" + lockedY + "px";
    document.body.classList.add("lightbox-open");
  }

  function unlockScroll() {
    document.body.classList.remove("lightbox-open");
    document.body.style.top = "";
    window.scrollTo(0, lockedY);
  }

  function fitLightbox() {
    var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    dialog.style.height = h + "px";
    requestAnimationFrame(function () { placeLightbox("auto"); });
  }

  function openLightbox(from) {
    opener = from || document.getElementById("zoom");
    pause();
    dialog.hidden = false;
    lockScroll();
    setInert(true);
    fitLightbox();
    dialog.setAttribute("aria-label", "Förstorad skärmbild: " + slides[index].getAttribute("data-name"));
    document.getElementById("lightbox-close").focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    dialog.style.height = "";
    setInert(false);
    unlockScroll();
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  var tap = false, tapX = 0, tapY = 0;
  reel.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tap = true;
    tapX = e.clientX;
    tapY = e.clientY;
  }, { passive: true });
  reel.addEventListener("pointerup", function (e) {
    if (!tap) return;
    tap = false;
    if (Math.abs(e.clientX - tapX) > 8 || Math.abs(e.clientY - tapY) > 8) return;
    openLightbox(document.getElementById("zoom"));
  }, { passive: true });
  reel.addEventListener("pointercancel", function () { tap = false; });

  document.getElementById("zoom").addEventListener("click", function () {
    openLightbox(document.getElementById("zoom"));
  });

  var lbTap = false, lbX = 0, lbY = 0, lbMoved = false;
  lbReel.addEventListener("pointerdown", function (e) {
    lbTap = true;
    lbMoved = false;
    lbX = e.clientX;
    lbY = e.clientY;
  }, { passive: true });
  lbReel.addEventListener("pointermove", function (e) {
    if (!lbTap) return;
    if (Math.abs(e.clientX - lbX) > 8 || Math.abs(e.clientY - lbY) > 8) lbMoved = true;
  }, { passive: true });
  lbReel.addEventListener("pointerup", function () { lbTap = false; });
  lbReel.addEventListener("pointercancel", function () { lbTap = false; lbMoved = true; });

  dialog.addEventListener("click", function (e) {
    if (lbMoved) { lbMoved = false; return; }
    if (e.target.closest("button, img")) return;
    closeLightbox();
  });
  document.getElementById("lightbox-close").addEventListener("click", function (e) {
    e.stopPropagation();
    closeLightbox();
  });
  arm(document.getElementById("lightbox-prev"), function () { go(index - 1, true); });
  arm(document.getElementById("lightbox-next"), function () { go(index + 1, true); });

  dialog.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); closeLightbox(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); go(index + 1, true); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); go(index - 1, true); return; }
    if (e.key !== "Tab") return;
    var nodes = Array.prototype.filter.call(dialog.querySelectorAll("button"), function (b) { return !b.disabled; });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      if (!dialog.hidden) fitLightbox();
    });
  }
})();
