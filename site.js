(function () {
  var features = [
    {
      id: "hem",
      name: "Hem",
      title: "Bilen, just nu",
      text: "Hemsidan visar laddning, räckvidd, lås, vaktläge och klimat. Under det ligger de senaste resorna, med en karta över den senaste sträckan. Bilderna är från demoläget: bilen, platserna och siffrorna är påhittade exempel."
    },
    {
      id: "journal",
      name: "Körjournal",
      title: "Körjournal",
      text: "Varje resa sparas med sträcka, tid och tagg, till exempel tjänst eller privat. Du kan fylla i ärende och vem du besökte. Journalen kan exporteras som CSV eller PDF, i det format som behövs som underlag till Skatteverket.",
      aside: "images/resa.webp",
      asidePng: "images/resa.png",
      asideAlt: "En demoresa med karta från Sveavägen till Kista Galleria.",
      asideCap: "En resa, med karta"
    },
    {
      id: "laddning",
      name: "Laddning",
      title: "Laddning och elpris",
      text: "När bilen laddar visar Igge effekt, tillagd energi och om laddningen sker hemma eller borta. Elpriset används för att räkna vad hemmaladdningen kostar och för att peka ut det billigaste fönstret. Prisanropen innehåller inte ditt konto."
    },
    {
      id: "batteri",
      name: "Batteri",
      title: "Batterihälsa",
      text: "Igge använder bilens eget värde för full kapacitet när bilen skickar det. Annars uppskattas hälsan ur energi mot laddnivå, och ur energi in vid laddningar. En siffra visas först när underlaget räcker och osäkerheten är liten."
    },
    {
      id: "kostnader",
      name: "Kostnader",
      title: "Kostnader",
      text: "Kostnadssidan räknar vad körningen kostar per mil, utifrån elpris, laddning och den sträcka journalen har. Den jämför också med vad samma sträcka hade kostat med bensin."
    },
    {
      id: "widgets",
      name: "Widgets",
      title: "Widgets",
      text: "Igge har widgets för hemskärmen, i litet, mellan och stort format. De visar körjournal eller batteri i korthet, utan adresser och utan koordinater. Bilderna är tagna på simulatorns hemskärm i demoläge."
    },
    {
      id: "korlage",
      name: "Körläge",
      title: "Körläge",
      text: "Körläget är till för när du sitter i bilen. En stor fartmätare, resans energi och nästa del av rutten syns utan att du letar i menyerna. Telefonens egen plats används bara om du tillåter den, och den skickas inte till Tesla."
    }
  ];

  var reel = document.getElementById("reel");
  var tabs = document.getElementById("tabs");
  var title = document.getElementById("feature-title");
  var text = document.getElementById("feature-text");
  var aside = document.getElementById("aside");
  var asideImg = document.getElementById("aside-img");
  var asideCap = document.getElementById("aside-cap");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var index = 0;
  var timer = null;
  var paused = false;

  features.forEach(function (f, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = f.name;
    b.setAttribute("role", "tab");
    b.id = "tab-" + f.id;
    b.setAttribute("aria-controls", "panel");
    b.addEventListener("click", function () { go(i, true); });
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

  function place(i) {
    sizeSlides();
    ignoreScroll = true;
    reel.scrollLeft = i * slideWidth();
    requestAnimationFrame(function () {
      sizeSlides();
      ignoreScroll = true;
      reel.scrollLeft = i * slideWidth();
      ignoreScroll = false;
    });
  }

  function render(i) {
    var f = features[i];
    title.textContent = f.title;
    text.textContent = f.text;
    Array.prototype.forEach.call(tabs.children, function (b, n) {
      var on = n === i;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    if (f.aside) {
      aside.hidden = false;
      asideImg.src = f.aside;
      asideImg.alt = f.asideAlt;
      asideCap.textContent = f.asideCap;
    } else {
      aside.hidden = true;
    }
    var widgets = document.getElementById("widget-row");
    if (widgets) widgets.hidden = f.id !== "widgets";
    if ((location.hash || "").replace("#", "") !== f.id) {
      history.replaceState(null, "", "#" + f.id);
    }
  }

  function go(i, user) {
    index = (i + features.length) % features.length;
    sizeSlides();
    var behavior = reduce ? "auto" : "smooth";
    var child = reel.children[index];
    if (child && !reduce && behavior === "smooth") {
      child.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    } else if (child) {
      child.scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
    }
    render(index);
    if (user) pause();
  }

  function nearest() {
    return Math.max(0, Math.min(features.length - 1, Math.round(reel.scrollLeft / slideWidth())));
  }

  var scrollTick = null;
  var ignoreScroll = false;
  reel.addEventListener("scroll", function () {
    if (ignoreScroll) return;
    if (scrollTick) cancelAnimationFrame(scrollTick);
    scrollTick = requestAnimationFrame(function () {
      var i = nearest();
      if (i !== index) { index = i; render(i); }
    });
  }, { passive: true });

  document.getElementById("prev").addEventListener("click", function () { go(index - 1, true); });
  document.getElementById("next").addEventListener("click", function () { go(index + 1, true); });

  reel.addEventListener("keydown", function (e) {
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
  features.forEach(function (f, i) { if (f.id === asked) start = i; });
  index = start;
  render(start);
  place(start);
  window.addEventListener("load", function () { place(index); });
  window.addEventListener("resize", function () { place(index); });
})();
