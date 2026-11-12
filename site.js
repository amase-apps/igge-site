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
    var phone = phoneForSlide[id] || "";
    document.querySelector(".phone").classList.toggle("bare", phone === "");
    Array.prototype.forEach.call(document.querySelectorAll(".phone-tabs button"), function (b) {
      var on = phone !== "" && b.getAttribute("data-phone") === phone;
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
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
  var phoneForSlide = {
    hem: "hem", journal: "journal", laddning: "hem", batteri: "battery",
    kostnader: "costs", widgets: "", korlage: "", fordon: "vehicle"
  };
  var slideForPhone = {
    hem: "hem", journal: "journal", battery: "batteri", costs: "kostnader", vehicle: "fordon"
  };

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

  Array.prototype.forEach.call(document.querySelectorAll(".phone-tabs button"), function (b) {
    b.addEventListener("click", function () {
      var id = slideForPhone[b.getAttribute("data-phone")];
      var i = slides.findIndex(function (slide) { return slide.getAttribute("data-slide") === id; });
      if (i >= 0) go(i, true);
    });
  });

  reel.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (!e.target.closest(".pane-scroll")) return;
    reel.scrollLeft += e.deltaX;
    e.preventDefault();
  }, { passive: false });

  var modal = document.getElementById("phone-modal");
  var phone = document.getElementById("phone");
  var phoneHome = phone.parentNode;
  var expandBtn = document.getElementById("phone-expand");
  var closeBtn = document.getElementById("phone-modal-close");
  var lockedY = 0;

  function modalButtons() {
    var nodes = [closeBtn];
    if (!phone.classList.contains("bare")) {
      Array.prototype.forEach.call(phone.querySelectorAll(".phone-tabs button"), function (b) { nodes.push(b); });
    }
    return nodes;
  }

  function setInert(on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === modal) return;
      if (on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function lockPage() {
    lockedY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = "-" + lockedY + "px";
    document.body.classList.add("phone-locked");
  }

  function unlockPage() {
    document.body.classList.remove("phone-locked");
    document.body.style.top = "";
    window.scrollTo(0, lockedY);
  }

  function settlePhone() {
    requestAnimationFrame(function () { moveReel(index, "auto"); });
  }

  function openPhone() {
    pause();
    phoneHome.style.minHeight = phone.offsetHeight + "px";
    document.getElementById("phone-modal-stage").appendChild(phone);
    modal.hidden = false;
    var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    modal.style.height = h + "px";
    lockPage();
    setInert(true);
    closeBtn.focus({ preventScroll: true });
    settlePhone();
  }

  function closePhone() {
    if (modal.hidden) return;
    phoneHome.insertBefore(phone, phoneHome.firstChild);
    phoneHome.style.minHeight = "";
    modal.hidden = true;
    modal.style.height = "";
    setInert(false);
    unlockPage();
    expandBtn.focus({ preventScroll: true });
    settlePhone();
  }

  expandBtn.addEventListener("click", openPhone);
  closeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closePhone();
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closePhone();
  });
  modal.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); closePhone(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); go(index + 1, true); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); go(index - 1, true); return; }
    if (e.key !== "Tab") return;
    var nodes = modalButtons();
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      if (!modal.hidden) modal.style.height = window.visualViewport.height + "px";
    });
  }
})();
