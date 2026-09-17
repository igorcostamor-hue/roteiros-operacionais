const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DATA = window.ROTEIROS_DATA;

const state = {
  agreementId: null,
  productId: null,
  bankId: null,
};

const agreementNav = $("#agreementNav");
const productNavArea = $("#productNavArea");
const content = $("#content");
const globalSearch = $("#globalSearch");
const searchResults = $("#searchResults");
const sidebar = $("#sidebar");
const menuButton = $("#menuButton");
const sidebarScrim = $("#sidebarScrim");

function init() {
  renderAgreementNav();
  renderHome();
  bindGlobalEvents();
}

function renderAgreementNav() {
  agreementNav.innerHTML = "";
  DATA.agreements.forEach(agreement => {
    const button = document.createElement("button");
    button.className = `nav-button ${state.agreementId === agreement.id ? "active" : ""}`;
    button.innerHTML = `<span class="nav-icon">${agreement.name.slice(0,2).toUpperCase()}</span><span>${agreement.name}</span>`;
    button.addEventListener("click", () => selectAgreement(agreement.id));
    agreementNav.appendChild(button);
  });
}

function selectAgreement(agreementId) {
  state.agreementId = agreementId;
  state.productId = null;
  state.bankId = null;
  renderAgreementNav();
  renderProductNav();
  renderAgreementLanding();
  closeMobileSidebar();
}

function renderProductNav() {
  const agreement = getAgreement();
  if (!agreement) {
    productNavArea.innerHTML = "";
    return;
  }

  productNavArea.innerHTML = `<div class="sidebar-section-label">Produtos</div>`;

  agreement.products.forEach(product => {
    const group = document.createElement("div");
    group.className = "product-group";

    const heading = document.createElement("button");
    heading.className = "product-heading";
    heading.innerHTML = `<span>${product.name}</span><span class="chevron">⌄</span>`;
    heading.addEventListener("click", () => {
      const list = $(".bank-list", group);
      const collapsed = !list.classList.contains("hidden");
      list.classList.toggle("hidden", collapsed);
      heading.classList.toggle("collapsed", collapsed);
    });

    const list = document.createElement("div");
    list.className = "bank-list";

    if (!product.banks?.length) {
      const empty = document.createElement("div");
      empty.className = "small-muted";
      empty.style.padding = "8px 10px 12px 14px";
      empty.textContent = "Sem bancos cadastrados.";
      list.appendChild(empty);
    } else {
      product.banks.forEach(bank => {
        const bankButton = document.createElement("button");
        bankButton.className = `bank-button ${state.productId === product.id && state.bankId === bank.id ? "active" : ""}`;
        bankButton.textContent = bank.name;
        bankButton.addEventListener("click", () => selectBank(product.id, bank.id));
        list.appendChild(bankButton);
      });
    }

    group.appendChild(heading);
    group.appendChild(list);
    productNavArea.appendChild(group);
  });
}

function selectBank(productId, bankId) {
  state.productId = productId;
  state.bankId = bankId;
  renderProductNav();
  renderBankPage();
  closeMobileSidebar();
}

function getAgreement() {
  return DATA.agreements.find(a => a.id === state.agreementId);
}

function getProduct() {
  return getAgreement()?.products.find(p => p.id === state.productId);
}

function getBank() {
  return getProduct()?.banks.find(b => b.id === state.bankId);
}

function renderHome() {
  state.agreementId = null;
  state.productId = null;
  state.bankId = null;
  renderAgreementNav();
  productNavArea.innerHTML = "";

  const activeAgreements = DATA.agreements.filter(a => a.products?.some(p => p.banks?.length));
  const totalProducts = DATA.agreements.reduce((acc, a) => acc + (a.products?.length || 0), 0);
  const totalBanks = DATA.agreements.reduce((acc, a) => acc + (a.products || []).reduce((pAcc, p) => pAcc + (p.banks?.length || 0), 0), 0);

  content.innerHTML = `
    <div class="home-hero">
      <section class="hero-card">
        <div class="eyebrow">Base operacional</div>
        <h1>Roteiros Operacionais</h1>
        <p>Consulta rápida de regras por convênio, produto e banco.</p>
      </section>

      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${DATA.agreements.length}</div><div class="stat-label">Convênios</div></div>
        <div class="stat-card"><div class="stat-value">${totalProducts}</div><div class="stat-label">Produtos</div></div>
        <div class="stat-card"><div class="stat-value">${totalBanks}</div><div class="stat-label">Bancos cadastrados</div></div>
      </div>

      <div class="agreement-cards">
        ${DATA.agreements.map(agreement => {
          const count = agreement.products?.reduce((sum,p) => sum + (p.banks?.length || 0), 0) || 0;
          return `<button class="agreement-card ${count ? "" : "empty"}" data-agreement="${agreement.id}">
            <div class="name">${escapeHtml(agreement.name)}</div>
            <div class="meta">${count ? `${count} banco${count === 1 ? "" : "s"} cadastrado${count === 1 ? "" : "s"}` : "Sem conteúdo cadastrado"}</div>
          </button>`;
        }).join("")}
      </div>
    </div>`;

  $$(".agreement-card", content).forEach(button => {
    button.addEventListener("click", () => selectAgreement(button.dataset.agreement));
  });
}

function renderAgreementLanding() {
  const agreement = getAgreement();
  if (!agreement) return renderHome();

  const totalBanks = agreement.products.reduce((sum,p) => sum + (p.banks?.length || 0), 0);
  content.innerHTML = `
    <div class="page-shell">
      <div class="breadcrumb"><span>Roteiros Operacionais</span><span class="sep">/</span><strong>${escapeHtml(agreement.name)}</strong></div>
      <div class="page-header">
        <div>
          <div class="eyebrow">Convênio</div>
          <h1>${escapeHtml(agreement.name)}</h1>
          <p class="page-lead">Selecione um produto e um banco no menu lateral para consultar as regras.</p>
        </div>
      </div>
      ${totalBanks ? renderAgreementProductCards(agreement) : `<div class="empty-state"><div class="empty-icon">○</div><h1>Sem conteúdo cadastrado</h1><p>Este convênio ainda não possui regras cadastradas.</p></div>`}
    </div>`;
}

function renderAgreementProductCards(agreement) {
  return `<div class="agreement-cards">${agreement.products.map(product => {
    const count = product.banks?.length || 0;
    return `<button class="agreement-card ${count ? "" : "empty"}" data-product="${product.id}">
      <div class="name">${escapeHtml(product.name)}</div>
      <div class="meta">${count ? `${count} banco${count === 1 ? "" : "s"}` : "Sem bancos cadastrados"}</div>
    </button>`;
  }).join("")}</div>`;
}

function renderBankPage() {
  const agreement = getAgreement();
  const product = getProduct();
  const bank = getBank();
  if (!agreement || !product || !bank) return;

  if (bank.templateOnly || !bank.sections?.length) {
    content.innerHTML = `
      <div class="page-shell">
        ${renderBreadcrumb(agreement, product, bank)}
        <div class="page-header">
          <div>
            <div class="eyebrow">${escapeHtml(product.name)}</div>
            <h1>${escapeHtml(bank.name)}</h1>
          </div>
        </div>
        <div class="empty-state"><div class="empty-icon">○</div><h1>Sem regras cadastradas</h1><p>Estrutura criada para preenchimento progressivo.</p></div>
      </div>`;
    return;
  }

  const sections = bank.sections || [];
  content.innerHTML = `
    <div class="page-shell">
      ${renderBreadcrumb(agreement, product, bank)}
      <div class="page-header">
        <div>
          <div class="eyebrow">${escapeHtml(product.name)}</div>
          <h1>${escapeHtml(bank.name)}</h1>
        </div>
      </div>
      <div class="rule-grid">
        ${sections.map(section => renderSection(section)).join("")}
      </div>
    </div>`;
}

function renderBreadcrumb(agreement, product, bank) {
  return `<div class="breadcrumb"><span>Roteiros Operacionais</span><span class="sep">/</span><span>${escapeHtml(agreement.name)}</span><span class="sep">/</span><span>${escapeHtml(product.name)}</span><span class="sep">/</span><strong>${escapeHtml(bank.name)}</strong></div>`;
}

function renderSection(section) {
  const full = section.full ? " full" : "";
  const alert = section.alert ? " alert" : "";
  return `<section class="rule-card${full}${alert}"><h2>${escapeHtml(section.title)}</h2>${renderItems(section.items || [])}</section>`;
}

function renderItems(items) {
  if (!items.length) return `<div class="empty-rule-value">—</div>`;
  return `<ul class="rule-list">${items.map(item => {
    if (typeof item === "string") return `<li>${escapeHtml(item)}</li>`;
    const status = item.status === "yes" ? "yes" : item.status === "no" ? "no" : "";
    const icon = status === "yes" ? "✓" : status === "no" ? "✕" : "";
    if (status) return `<li class="status-line"><span class="status-icon ${status}" aria-hidden="true">${icon}</span><span>${escapeHtml(item.text || "")}</span></li>`;
    return `<li>${escapeHtml(item.text || "")}</li>`;
  }).join("")}</ul>`;
}

function bindGlobalEvents() {
  globalSearch.addEventListener("input", () => performSearch(globalSearch.value));
  globalSearch.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      globalSearch.value = "";
      performSearch("");
      globalSearch.blur();
    }
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      globalSearch.focus();
      globalSearch.select();
    }
  });

  menuButton?.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarScrim.classList.toggle("show");
  });
  sidebarScrim?.addEventListener("click", closeMobileSidebar);

  document.querySelector(".brand-wrap")?.addEventListener("click", renderHome);
}

function closeMobileSidebar() {
  sidebar.classList.remove("open");
  sidebarScrim.classList.remove("show");
}

function performSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    searchResults.classList.add("hidden");
    searchResults.innerHTML = "";
    return;
  }

  const matches = [];
  DATA.agreements.forEach(agreement => {
    (agreement.products || []).forEach(product => {
      (product.banks || []).forEach(bank => {
        const sectionText = (bank.sections || []).flatMap(section => [section.title, ...(section.items || []).map(item => typeof item === "string" ? item : item.text || "")]).join(" ");
        const haystack = `${agreement.name} ${product.name} ${bank.name} ${bank.title || ""} ${bank.sourcePath || ""} ${sectionText}`.toLowerCase();
        if (haystack.includes(q)) {
          matches.push({ agreement, product, bank, snippet: buildSnippet(haystack, q, bank) });
        }
      });
    });
  });

  searchResults.classList.remove("hidden");
  searchResults.innerHTML = `<div class="search-results-header">${matches.length} resultado${matches.length === 1 ? "" : "s"}</div>` + (matches.length ? matches.slice(0,30).map((match, index) => `
    <button class="search-result-item" data-index="${index}">
      <div class="search-result-title">${escapeHtml(match.bank.name)}</div>
      <div class="search-result-path">${escapeHtml(match.agreement.name)} / ${escapeHtml(match.product.name)}</div>
      <div class="search-result-snippet">${escapeHtml(match.snippet)}</div>
    </button>`).join("") : `<div class="search-result-item">Nenhum resultado encontrado.</div>`);

  $$(".search-result-item[data-index]", searchResults).forEach(button => {
    button.addEventListener("click", () => {
      const match = matches[Number(button.dataset.index)];
      state.agreementId = match.agreement.id;
      state.productId = match.product.id;
      state.bankId = match.bank.id;
      renderAgreementNav();
      renderProductNav();
      renderBankPage();
      globalSearch.value = "";
      performSearch("");
    });
  });
}

function buildSnippet(haystack, q, bank) {
  const original = (bank.sections || []).flatMap(section => [section.title, ...(section.items || []).map(item => typeof item === "string" ? item : item.text || "")]).join(" • ");
  const lower = original.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return original.slice(0, 140);
  const start = Math.max(0, idx - 45);
  const end = Math.min(original.length, idx + q.length + 90);
  return `${start > 0 ? "…" : ""}${original.slice(start,end)}${end < original.length ? "…" : ""}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch]));
}

init();
