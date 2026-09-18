(function () {
  "use strict";

  const config = Object.assign(
    {
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      PROJECT_ID: "lo-mul-brand-test",
      randomizeWithinSections: false,
    },
    window.LO_MUL_CONFIG || {},
  );

  const sections = [
    {
      id: "fonts",
      number: "01",
      label: "Tipografies",
      intro:
        "Començarem observant com diferents tipografies transformen la personalitat de loMUL. Valora-les per sensació, no cal pensar-hi massa.",
      items: Array.isArray(window.LO_MUL_FONTS) ? window.LO_MUL_FONTS : [],
    },
    {
      id: "icons",
      number: "02",
      label: "Icones",
      intro:
        "Ara ens fixarem en formes, símbols i gestos gràfics. Tria les peces que sentis més pròximes al caràcter de loMUL.",
      items: Array.isArray(window.LO_MUL_ICONS) ? window.LO_MUL_ICONS : [],
    },
    {
      id: "graphics",
      number: "03",
      label: "Llenguatge gràfic",
      intro:
        "Aquí mirarem referents complets: fotografia, color, composició, ritme i manera d’organitzar els continguts. Valora l’atmosfera general de cada proposta.",
      items: Array.isArray(window.LO_MUL_GRAPHICS) ? window.LO_MUL_GRAPHICS : [],
    },
  ];

  const ratingOptions = [
    { id: "love", label: "M’agrada molt", score: 3 },
    { id: "interesting", label: "M’interessa", score: 2 },
    { id: "not_for_me", label: "No ho veig", score: 1 },
    { id: "dislike", label: "No m’agrada", score: 0 },
  ];

  const app = document.querySelector("#app");
  let state = restoreState();
  let infoVisible = false;
  let transitionTimer = null;

  loadGoogleFonts();
  render();

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function freshState() {
    return {
      sessionId: createId(),
      started: false,
      completed: false,
      submitted: false,
      clientName: "",
      createdAt: new Date().toISOString(),
      completedAt: null,
      sectionIndex: 0,
      itemIndex: 0,
      showSectionIntro: true,
      responses: {},
      order: Object.fromEntries(
        sections.map((section) => {
          const ids = section.items.map((item) => item.id);
          return [section.id, config.randomizeWithinSections ? shuffle(ids) : ids];
        }),
      ),
    };
  }

  function restoreState() {
    const saved = window.LoMulStorage.load(config.PROJECT_ID);
    if (!saved || !saved.sessionId || typeof saved.responses !== "object") {
      return freshState();
    }

    const next = Object.assign(freshState(), saved);
    if (typeof saved.showSectionIntro !== "boolean") {
      next.showSectionIntro = Boolean(saved.started && !saved.completed && saved.itemIndex === 0);
    }
    sections.forEach((section) => {
      const liveIds = section.items.map((item) => item.id);
      const savedIds = Array.isArray(next.order[section.id]) ? next.order[section.id] : [];
      const retained = savedIds.filter((id) => liveIds.includes(id));
      const added = liveIds.filter((id) => !retained.includes(id));
      next.order[section.id] = [...retained, ...added];
    });
    return next;
  }

  function persist() {
    window.LoMulStorage.save(config.PROJECT_ID, state);
  }

  function loadGoogleFonts() {
    const families = sections[0].items
      .filter((font) => font.googleFont && font.family)
      .map((font) => {
        const weights = Array.isArray(font.weights) && font.weights.length ? font.weights : [400];
        return `family=${encodeURIComponent(font.family)}:wght@${weights.join(";")}`;
      });

    if (!families.length) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
    document.head.appendChild(link);
  }

  function sectionOrder(section) {
    return state.order[section.id] || [];
  }

  function currentContext() {
    const section = sections[state.sectionIndex];
    if (!section) return null;
    const order = sectionOrder(section);
    const id = order[state.itemIndex];
    const item = section.items.find((candidate) => candidate.id === id);
    return item ? { section, item, order } : null;
  }

  function responseKey(sectionId, itemId) {
    return `${sectionId}:${itemId}`;
  }

  function render() {
    window.clearTimeout(transitionTimer);
    infoVisible = false;

    if (!state.started) {
      renderIntro();
      return;
    }

    if (state.completed) {
      renderCompletion();
      return;
    }

    if (state.showSectionIntro) {
      renderSectionIntro();
      return;
    }

    const context = currentContext();
    if (!context) {
      moveForward();
      return;
    }

    renderTest(context);
  }

  function renderIntro() {
    app.innerHTML = `
      <div class="app-shell intro">
        <section class="intro__content" aria-labelledby="intro-title">
          <p class="wordmark">Lo Mul</p>
          <h1 id="intro-title">Exploració visual</h1>
          <p class="intro__lead">Veurem diferents opcions visuals per entendre gustos, sensibilitats i possibles direccions de la identitat.</p>
          <ol class="steps" aria-label="Passos del test">
            <li><span>01</span><span>Tipografies</span></li>
            <li><span>02</span><span>Icones</span></li>
            <li><span>03</span><span>Llenguatge gràfic</span></li>
          </ol>
          <form class="intro__form" id="intro-form">
            <div class="field">
              <label for="client-name">Nom <span aria-hidden="true">(opcional)</span></label>
              <input class="text-input" id="client-name" name="client-name" autocomplete="name" value="${escapeAttribute(state.clientName)}" />
            </div>
            <button class="primary-button" type="submit">Començar</button>
          </form>
        </section>
      </div>`;

    document.querySelector("#intro-form").addEventListener("submit", (event) => {
      event.preventDefault();
      state.clientName = document.querySelector("#client-name").value.trim();
      state.started = true;
      persist();
      render();
    });
  }

  function renderSectionIntro() {
    const section = sections[state.sectionIndex];
    if (!section) {
      completeTest();
      return;
    }

    app.innerHTML = `
      <div class="app-shell chapter-view">
        <header class="chapter-header">
          <span>Lo Mul</span>
          <span>${section.number} / ${pad(sections.length)}</span>
        </header>
        <section class="chapter" aria-labelledby="chapter-title">
          <p class="chapter__eyebrow">Capítol ${section.number}</p>
          <div class="chapter__number" aria-hidden="true">${section.number}</div>
          <div class="chapter__content">
            <h1 id="chapter-title">${section.label}</h1>
            <p>${section.intro}</p>
            <div class="chapter__actions">
              <button class="chapter__back" id="chapter-back" type="button">Tornar</button>
              <button class="primary-button chapter__start" id="chapter-start" type="button">
                <span>Començar</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12h16M14 6l6 6-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>`;

    document.querySelector("#chapter-start").addEventListener("click", enterSection);
    document.querySelector("#chapter-back").addEventListener("click", moveBackwardFromChapter);
  }

  function enterSection() {
    state.showSectionIntro = false;
    persist();
    render();
  }

  function moveBackwardFromChapter() {
    if (state.sectionIndex === 0) {
      state.started = false;
    } else {
      state.sectionIndex -= 1;
      state.itemIndex = Math.max(0, sectionOrder(sections[state.sectionIndex]).length - 1);
      state.showSectionIntro = false;
    }
    persist();
    render();
  }

  function renderTest({ section, item, order }) {
    const key = responseKey(section.id, item.id);
    const existing = state.responses[key] || {};
    const progress = order.length ? ((state.itemIndex + 1) / order.length) * 100 : 0;
    const isLastItem =
      state.sectionIndex === sections.length - 1 && state.itemIndex === order.length - 1;

    app.innerHTML = `
      <div class="app-shell test-view">
        <header class="test-header">
          <span>Lo Mul</span>
          <span class="test-header__section">${section.number} / ${section.label}</span>
          <span class="test-header__count">${pad(state.itemIndex + 1)} / ${pad(order.length)}</span>
          <div class="progress-track" aria-hidden="true" style="--progress: ${progress}%"><span></span></div>
        </header>
        <section class="stage" aria-label="Proposta visual">
          <div class="stage__inner">
            ${visualMarkup(section, item)}
            <button class="info-button" id="info-button" type="button" aria-expanded="false">Veure informació</button>
            <p class="info-panel" id="info-panel" aria-live="polite"></p>
          </div>
        </section>
        <section class="response-area" aria-label="La teva resposta">
          <div class="rating-group" role="group" aria-label="Valora aquesta proposta">
            ${ratingOptions
              .map(
                (option, index) => `
                  <button
                    class="rating-button"
                    type="button"
                    data-rating="${option.id}"
                    aria-pressed="${existing.rating === option.id}"
                    aria-keyshortcuts="${index + 1}"
                  >${option.label}</button>`,
              )
              .join("")}
          </div>
          <div class="comment-field">
            <label for="comment">Vols afegir algun comentari?</label>
            <textarea class="comment-input" id="comment" rows="3" placeholder="Escriu aquí…">${escapeHtml(existing.comment || "")}</textarea>
          </div>
          <div class="response-footer">
            <button class="back-button" id="back-button" type="button" aria-label="Tornar a l’element anterior">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <p class="response-status" id="response-status" role="status"></p>
            <button class="next-button" id="next-button" type="button">
              <span>${isLastItem ? "Finalitzar" : "Següent"}</span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h16M14 6l6 6-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <p class="shortcut-hint" aria-hidden="true">Tecles 1–4 per seleccionar · → següent · ← tornar</p>
        </section>
      </div>`;

    document.querySelectorAll("[data-rating]").forEach((button) => {
      button.addEventListener("click", () => answer(button.dataset.rating));
    });
    document.querySelector("#comment").addEventListener("input", saveComment);
    document.querySelector("#info-button").addEventListener("click", () => toggleInfo(section, item));
    document.querySelector("#back-button").addEventListener("click", moveBackward);
    document.querySelector("#next-button").addEventListener("click", advanceAfterResponse);
  }

  function visualMarkup(section, item) {
    if (section.id === "fonts") {
      const family = escapeAttribute(item.family || "serif");
      const fallback =
        item.category === "sans"
          ? "sans-serif"
          : item.category === "mono"
            ? "monospace"
            : item.category === "handwriting"
              ? "cursive"
              : "serif";
      return `
        <div class="font-specimen" style="font-family: '${family}', ${fallback}">
          <h2 class="font-specimen__title">loMUL</h2>
          <p class="font-specimen__sample">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>`;
    }

    const imageClass =
      section.id === "icons"
        ? " visual-image--icon"
        : section.id === "graphics"
          ? " visual-image--graphic"
          : "";
    return `<img class="visual-image${imageClass}" src="${escapeAttribute(item.file)}" alt="${escapeAttribute(item.name || item.company || "Proposta visual")}" />`;
  }

  function toggleInfo(section, item) {
    infoVisible = !infoVisible;
    const button = document.querySelector("#info-button");
    const panel = document.querySelector("#info-panel");
    button.setAttribute("aria-expanded", String(infoVisible));

    if (!infoVisible) {
      panel.innerHTML = "";
      return;
    }

    if (section.id === "fonts") {
      panel.textContent = `${item.name} · ${item.category || ""}`;
    } else {
      panel.textContent = `${item.name}${item.tags?.length ? ` · ${item.tags.join(", ")}` : ""}`;
    }
  }

  function saveComment(event) {
    const context = currentContext();
    if (!context) return;
    const key = responseKey(context.section.id, context.item.id);
    const existing = state.responses[key] || {};
    state.responses[key] = {
      section: context.section.id,
      item_id: context.item.id,
      rating: existing.rating || null,
      score: Number.isFinite(existing.score) ? existing.score : null,
      comment: event.target.value,
      answered_at: existing.answered_at || null,
    };
    persist();
  }

  function answer(ratingId) {
    const context = currentContext();
    const option = ratingOptions.find((candidate) => candidate.id === ratingId);
    if (!context || !option) return;

    const key = responseKey(context.section.id, context.item.id);
    state.responses[key] = {
      section: context.section.id,
      item_id: context.item.id,
      rating: option.id,
      score: option.score,
      comment: document.querySelector("#comment")?.value || "",
      answered_at: new Date().toISOString(),
    };
    persist();

    document.querySelectorAll("[data-rating]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.rating === ratingId));
    });
    const status = document.querySelector("#response-status");
    if (status) status.textContent = "";
  }

  function advanceAfterResponse() {
    const context = currentContext();
    if (!context) return;
    const response = state.responses[responseKey(context.section.id, context.item.id)];
    if (!response?.rating) {
      const status = document.querySelector("#response-status");
      if (status) status.textContent = "Selecciona una opció per continuar.";
      document.querySelector(".rating-button")?.focus();
      return;
    }

    document.querySelector(".stage")?.classList.add("is-transitioning");
    transitionTimer = window.setTimeout(moveForward, prefersReducedMotion() ? 10 : 180);
  }

  function moveForward() {
    const section = sections[state.sectionIndex];
    if (!section) {
      completeTest();
      return;
    }

    const order = sectionOrder(section);
    if (state.itemIndex < order.length - 1) {
      state.itemIndex += 1;
    } else if (state.sectionIndex < sections.length - 1) {
      state.sectionIndex += 1;
      state.itemIndex = 0;
      state.showSectionIntro = true;
    } else {
      completeTest();
      return;
    }

    persist();
    render();
  }

  function moveBackward() {
    window.clearTimeout(transitionTimer);
    if (state.itemIndex > 0) {
      state.itemIndex -= 1;
    } else {
      state.showSectionIntro = true;
    }
    persist();
    render();
  }

  function completeTest() {
    state.completed = true;
    state.completedAt = new Date().toISOString();
    persist();
    render();
  }

  function renderCompletion() {
    const configured = window.LoMulSupabase.isConfigured(config);
    app.innerHTML = `
      <div class="app-shell completion">
        <section class="completion__content" aria-labelledby="completion-title">
          <p class="wordmark">Lo Mul</p>
          <h1 id="completion-title">Gràcies</h1>
          <p class="completion__lead">Les teves respostes ens ajudaran a definir la direcció visual de Lo Mul.</p>
          <div class="completion__summary" aria-label="Resum de respostes">
            ${sections
              .map(
                (section) => `
                  <div class="summary-row">
                    <span>${section.label}</span>
                    <span>${answeredCount(section.id)} respostes</span>
                  </div>`,
              )
              .join("")}
          </div>
          <div class="completion__actions">
            <button class="primary-button" id="submit-button" type="button">${state.submitted ? "Respostes guardades" : "Enviar respostes"}</button>
            ${!configured ? '<button class="secondary-button" id="export-button" type="button">Exportar JSON</button>' : ""}
          </div>
          <p class="status-message" id="status-message" role="status">${
            state.submitted
              ? "Respostes guardades correctament."
              : configured
                ? "Les respostes s’enviaran de manera segura."
                : "Supabase no està configurat. Pots exportar un fitxer JSON."
          }</p>
        </section>
      </div>`;

    document.querySelector("#submit-button").addEventListener("click", handleSubmit);
    document.querySelector("#export-button")?.addEventListener("click", exportJson);
  }

  async function handleSubmit() {
    if (state.submitted) return;
    if (!window.LoMulSupabase.isConfigured(config)) {
      exportJson();
      return;
    }

    const button = document.querySelector("#submit-button");
    const status = document.querySelector("#status-message");
    button.disabled = true;
    button.textContent = "Enviant…";
    status.textContent = "S’estan enviant les respostes.";

    try {
      await window.LoMulSupabase.submit(config, exportPayload());
      state.submitted = true;
      persist();
      button.textContent = "Respostes guardades";
      status.textContent = "Respostes guardades correctament.";
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.textContent = "Tornar-ho a provar";
      status.textContent = "No s’han pogut enviar. Revisa la connexió o exporta el JSON.";
      if (!document.querySelector("#export-button")) {
        const exportButton = document.createElement("button");
        exportButton.className = "secondary-button";
        exportButton.id = "export-button";
        exportButton.type = "button";
        exportButton.textContent = "Exportar JSON";
        exportButton.addEventListener("click", exportJson);
        document.querySelector(".completion__actions").appendChild(exportButton);
      }
    }
  }

  function exportPayload() {
    return {
      session_id: state.sessionId,
      project_id: config.PROJECT_ID,
      client_name: state.clientName || null,
      created_at: state.createdAt,
      completed_at: state.completedAt,
      user_agent: navigator.userAgent,
      responses: Object.values(state.responses)
        .filter((response) => response.rating)
        .map((response) => ({
          section: response.section,
          item_id: response.item_id,
          item_label: itemLabel(response.section, response.item_id),
          rating: response.rating,
          score: response.score,
          comment: response.comment || "",
          answered_at: response.answered_at,
        })),
    };
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lo-mul-respostes-${state.sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    const status = document.querySelector("#status-message");
    if (status) status.textContent = "Fitxer JSON descarregat.";
  }

  function answeredCount(sectionId) {
    return Object.values(state.responses).filter(
      (response) => response.section === sectionId && response.rating,
    ).length;
  }

  function itemLabel(sectionId, itemId) {
    const section = sections.find((candidate) => candidate.id === sectionId);
    const item = section?.items.find((candidate) => candidate.id === itemId);
    return item?.name || item?.family || itemId;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  document.addEventListener("keydown", (event) => {
    if (!state.started || state.completed) return;
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (typing) return;

    if (state.showSectionIntro) {
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        enterSection();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBackwardFromChapter();
      }
      return;
    }

    if (["1", "2", "3", "4"].includes(event.key)) {
      event.preventDefault();
      answer(ratingOptions[Number(event.key) - 1].id);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      advanceAfterResponse();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBackward();
    }
  });
})();
