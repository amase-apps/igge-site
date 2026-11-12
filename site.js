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
  }

  function nearest() {
    return Math.max(0, Math.min(slides.length - 1, Math.round(reel.scrollLeft / slideWidth())));
  }

  var programmatic = false;
  var scrollTimer = null;

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
  window.addEventListener("resize", function () { moveReel(index, "auto"); });
})();
