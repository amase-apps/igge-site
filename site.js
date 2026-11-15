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

  var dots = document.getElementById("phone-dots");
  slides.forEach(function (slide, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", slide.getAttribute("data-name"));
    b.addEventListener("click", function () {
      go(i, true);
      b.focus({ preventScroll: true });
    });
    dots.appendChild(b);
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
    Array.prototype.forEach.call(dots.children, function (b, n) {
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
    hem: "hem", journal: "journal", batteri: "battery",
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
  var suppressClick = false;
  var coastToken = 0;

  function scrollableY(el) {
    while (el && el !== document.body) {
      var style = window.getComputedStyle(el);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
      el = el.parentElement;
    }
    return null;
  }

  function horizontalSwipe(dx, dy) {
    return Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5;
  }

  function stopCoast() { coastToken += 1; }

  function endDragClass() {
    reel.classList.remove("is-dragging");
    document.documentElement.classList.remove("is-phone-dragging");
  }

  function changeView(dx) {
    endDragClass();
    go(index + (dx < 0 ? 1 : -1), true);
  }

  function coastDrag(state) {
    var velocity = Math.max(-1.2, Math.min(1.2, state.vy));
    if (reduce || Math.abs(velocity) < 0.35) { endDragClass(); return; }
    var token = coastToken;
    var last = performance.now();
    var frame = function (now) {
      if (token !== coastToken) return;
      var dt = Math.min(32, now - last);
      last = now;
      velocity *= Math.pow(0.86, dt / 16);
      state.scroller.scrollTop -= velocity * dt;
      if (Math.abs(velocity) > 0.04) requestAnimationFrame(frame);
      else endDragClass();
    };
    requestAnimationFrame(frame);
  }

  reel.addEventListener("dragstart", function (e) { e.preventDefault(); });

  reel.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target.closest("button, a")) return;
    stopCoast();
    suppressClick = false;
    endDragClass();
    drag = {
      id: e.pointerId,
      mouse: e.pointerType === "mouse",
      target: e.target,
      x: e.clientX,
      y: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      lt: performance.now(),
      vy: 0,
      axis: "",
      scroller: null
    };
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);
    if (drag.mouse) {
      try { reel.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });

  reel.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    if (!drag.axis) {
      if (horizontalSwipe(dx, dy)) {
        drag.axis = "x";
        suppressClick = true;
        if (drag.mouse) document.documentElement.classList.add("is-phone-dragging");
        try { reel.setPointerCapture(e.pointerId); } catch (err) {}
      } else if (Math.abs(dy) > 5 && Math.abs(dy) >= Math.abs(dx)) {
        drag.axis = "y";
        if (drag.mouse) {
          suppressClick = true;
          drag.scroller = scrollableY(drag.target);
          if (drag.scroller) drag.origin = drag.scroller.scrollTop + dy;
          document.documentElement.classList.add("is-phone-dragging");
          try { reel.setPointerCapture(e.pointerId); } catch (err) {}
        }
      } else return;
    }
    if (drag.axis === "x") {
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (!drag.mouse || !drag.scroller) return;
    if (e.cancelable) e.preventDefault();
    var now = performance.now();
    var dt = Math.max(1, now - drag.lt);
    drag.vy = (e.clientY - drag.ly) / dt;
    drag.ly = e.clientY;
    drag.lt = now;
    drag.scroller.scrollTop = drag.origin - dy;
  }, { passive: false });

  function endPointer(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var state = drag;
    drag = null;
    document.removeEventListener("pointerup", endPointer);
    document.removeEventListener("pointercancel", endPointer);
    if (e && reel.hasPointerCapture && reel.hasPointerCapture(e.pointerId)) {
      try { reel.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    if (e && e.type === "pointercancel") { endDragClass(); return; }
    var dx = e ? e.clientX - state.x : 0;
    var dy = e ? e.clientY - state.y : 0;
    if (state.axis === "x" || (!state.axis && horizontalSwipe(dx, dy))) {
      setTimeout(function () { suppressClick = false; }, 0);
      changeView(dx);
      return;
    }
    if (state.axis === "y" && state.mouse && state.scroller) {
      setTimeout(function () { suppressClick = false; }, 0);
      coastDrag(state);
      return;
    }
    endDragClass();
  }

  reel.addEventListener("pointerup", endPointer);
  reel.addEventListener("pointercancel", endPointer);

  var touch = null;

  reel.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { touch = null; return; }
    if (e.target.closest("button, a")) return;
    var point = e.touches[0];
    if (point.clientX <= 20) return;
    stopCoast();
    touch = { id: point.identifier, x: point.clientX, y: point.clientY, axis: "" };
  }, { passive: true, capture: true });

  reel.addEventListener("touchmove", function (e) {
    if (!touch || e.touches.length !== 1) return;
    var point = e.touches[0];
    if (point.identifier !== touch.id) return;
    var dx = point.clientX - touch.x;
    var dy = point.clientY - touch.y;
    if (!touch.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6 && e.cancelable) e.preventDefault();
        return;
      }
      touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (touch.axis === "x" && e.cancelable) {
      e.preventDefault();
      suppressClick = true;
    }
  }, { passive: false, capture: true });

  function endTouch(e) {
    if (!touch) return;
    var state = touch;
    touch = null;
    var point = null;
    if (e.changedTouches) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === state.id) point = e.changedTouches[i];
      }
    }
    if (e.type === "touchcancel" || !point) return;
    var dx = point.clientX - state.x;
    if (state.axis === "x" && Math.abs(dx) > 40) {
      setTimeout(function () { suppressClick = false; }, 0);
      changeView(dx);
    }
  }

  reel.addEventListener("touchend", endTouch);
  reel.addEventListener("touchcancel", endTouch);

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
