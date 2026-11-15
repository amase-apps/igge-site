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

  var outsidePhone = { widgets: true, korlage: true };
  slides.forEach(function (slide, i) {
    var id = slide.getAttribute("data-slide");
    if (!outsidePhone[id]) return;
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = slide.getAttribute("data-name");
    b.setAttribute("role", "tab");
    b.setAttribute("data-slide", id);
    b.id = "tab-" + id;
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
    var current = slides[i].getAttribute("data-slide");
    Array.prototype.forEach.call(tabs.children, function (b) {
      var on = b.getAttribute("data-slide") === current;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = 0;
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

  if (!reduce && new URLSearchParams(location.search).get("still") !== "1") {
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

  var drag = null;
  var dragMoved = false;
  var suppressClick = false;
  var coastToken = 0;

  function scrollable(el, axis) {
    while (el && el !== document.body) {
      var style = window.getComputedStyle(el);
      var overflow = axis === "x" ? style.overflowX : style.overflowY;
      if (overflow === "auto" || overflow === "scroll") {
        if (axis === "x" && el.scrollWidth > el.clientWidth + 1) return el;
        if (axis === "y" && el.scrollHeight > el.clientHeight + 1) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function stopCoast() { coastToken += 1; }

  function endDragClass() {
    reel.classList.remove("is-dragging");
    document.documentElement.classList.remove("is-phone-dragging");
  }

  function settleDrag(state) {
    endDragClass();
    if (state.axis === "x") go(nearest(), true);
  }

  function coastDrag(state) {
    var velocity = state.axis === "y" ? state.vy : state.vx;
    velocity = Math.max(-1.2, Math.min(1.2, velocity));
    if (reduce || Math.abs(velocity) < 0.35) { settleDrag(state); return; }
    var token = coastToken;
    var last = performance.now();
    var frame = function (now) {
      if (token !== coastToken) return;
      var dt = Math.min(32, now - last);
      last = now;
      velocity *= Math.pow(0.86, dt / 16);
      if (state.axis === "y") state.scroller.scrollTop -= velocity * dt;
      else state.scroller.scrollLeft -= velocity * dt;
      if (Math.abs(velocity) > 0.04) requestAnimationFrame(frame);
      else settleDrag(state);
    };
    requestAnimationFrame(frame);
  }

  reel.addEventListener("dragstart", function (e) { e.preventDefault(); });

  reel.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target.closest("button, a")) return;
    stopCoast();
    suppressClick = false;
    dragMoved = false;
    drag = {
      id: e.pointerId,
      target: e.target,
      x: e.clientX,
      y: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      lt: performance.now(),
      vx: 0,
      vy: 0,
      axis: "",
      scroller: null,
      origin: 0
    };
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);
    try { reel.setPointerCapture(e.pointerId); } catch (err) {}
  });

  reel.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id || e.pointerType !== "mouse") return;
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    if (!dragMoved) {
      if (Math.hypot(dx, dy) < 5) return;
      var axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      var scroller = scrollable(drag.target, axis);
      if (!scroller) return;
      dragMoved = true;
      suppressClick = true;
      drag.axis = axis;
      drag.scroller = scroller;
      drag.origin = axis === "y" ? scroller.scrollTop : scroller.scrollLeft;
      reel.classList.add("is-dragging");
      document.documentElement.classList.add("is-phone-dragging");
    }
    if (!drag.scroller) return;
    e.preventDefault();
    var now = performance.now();
    var dt = Math.max(1, now - drag.lt);
    drag.vx = (e.clientX - drag.lx) / dt;
    drag.vy = (e.clientY - drag.ly) / dt;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    drag.lt = now;
    if (drag.axis === "y") drag.scroller.scrollTop = drag.origin - dy;
    else drag.scroller.scrollLeft = drag.origin - dx;
  }, { passive: false });

  function endPointer(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var state = drag;
    var moved = dragMoved;
    drag = null;
    dragMoved = false;
    document.removeEventListener("pointerup", endPointer);
    document.removeEventListener("pointercancel", endPointer);
    if (e && reel.hasPointerCapture && reel.hasPointerCapture(e.pointerId)) {
      try { reel.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    if (!moved || !state.scroller) { endDragClass(); return; }
    setTimeout(function () { suppressClick = false; }, 0);
    coastDrag(state);
  }

  reel.addEventListener("pointerup", endPointer);
  reel.addEventListener("pointercancel", endPointer);

  reel.addEventListener("click", function (e) {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

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
