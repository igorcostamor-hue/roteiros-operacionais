(() => {
  const data = window.ROTEIROS_DATA;
  const els = {
    agreementNav: document.getElementById('agreementNav'),
    productNavArea: document.getElementById('productNavArea'),
    content: document.getElementById('content'),
    search: document.getElementById('globalSearch'),
    searchResults: document.getElementById('searchResults'),
    sidebar: document.getElementById('sidebar'),
    menuButton: document.getElementById('menuButton'),
    sidebarScrim: document.getElementById('sidebarScrim')
  };

  const state = {
    agreementId: 'inss',
    productId: null,
    bankId: null,
    collapsed: new Set(),
    searchIndex: []
  };

  function esc(v='') {
    return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function normalize(v='') {
    return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }

  function getAgreement(id=state.agreementId){ return data.agreements.find(a => a.id === id); }
  function getProduct(agreement, id=state.productId){ return agreement?.products?.find(p => p.id === id); }
  function getBank(product, id=state.bankId){ return product?.banks?.find(b => b.id === id); }

  function buildSearchIndex(){
    state.searchIndex = [];
    data.agreements.forEach(agreement => {
      agreement.products.forEach(product => {
        product.banks.forEach(bank => {
          const textParts = [agreement.name, product.name, bank.name, bank.title];
          bank.sections.forEach(s => {
            const searchableItems = (s.items || []).map(item => typeof item === 'object' ? item.text : item);
            textParts.push(s.title, ...searchableItems);
          });
          state.searchIndex.push({
            agreementId: agreement.id,
            productId: product.id,
            bankId: bank.id,
            title: bank.title,
            path: `${agreement.name} › ${product.name} › ${bank.name}`,
            text: textParts.join(' • '),
            normalized: normalize(textParts.join(' '))
          });
        });
      });
    });
  }

  function renderAgreementNav(){
    els.agreementNav.innerHTML = data.agreements.map(a => {
      const initials = a.name === 'AERONÁUTICA' ? 'AE' : a.name.slice(0,2);
      return `<button class="nav-button ${a.id===state.agreementId?'active':''}" data-agreement="${esc(a.id)}"><span class="nav-icon">${esc(initials)}</span><span>${esc(a.name)}</span></button>`;
    }).join('');

    els.agreementNav.querySelectorAll('[data-agreement]').forEach(btn => btn.addEventListener('click', () => {
      selectAgreement(btn.dataset.agreement);
    }));
  }

  function renderProductNav(){
    const agreement = getAgreement();
    if (!agreement || !agreement.products.length){
      els.productNavArea.innerHTML = `<div class="sidebar-section-label">Produtos</div><div class="small-muted" style="padding:8px 10px 18px">Nenhum produto cadastrado ainda.</div>`;
      return;
    }
    const groups = agreement.products.map(product => {
      const isCollapsed = state.collapsed.has(product.id);
      const bankButtons = product.banks.map(bank => `<button class="bank-button ${(product.id===state.productId&&bank.id===state.bankId)?'active':''}" data-product="${esc(product.id)}" data-bank="${esc(bank.id)}">${esc(bank.name)}</button>`).join('');
      return `<div class="product-group"><button class="product-heading ${isCollapsed?'collapsed':''}" data-toggle-product="${esc(product.id)}"><span>${esc(product.name)}</span><span class="chevron">▾</span></button><div class="bank-list ${isCollapsed?'hidden':''}" data-bank-list="${esc(product.id)}">${bankButtons}</div></div>`;
    }).join('');
    els.productNavArea.innerHTML = `<div class="sidebar-section-label">Produtos e bancos</div>${groups}`;
    els.productNavArea.querySelectorAll('[data-toggle-product]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.toggleProduct;
      if (state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id);
      renderProductNav();
    }));
    els.productNavArea.querySelectorAll('[data-bank]').forEach(btn => btn.addEventListener('click', () => {
      state.productId = btn.dataset.product;
      state.bankId = btn.dataset.bank;
      updateHash();
      renderProductNav();
      renderContent();
      closeSidebarOnMobile();
    }));
  }

  function countBanks(agreement){ return agreement.products.reduce((n,p)=>n+p.banks.length,0); }

  function renderHome(){
    const inss = data.agreements.find(a=>a.id==='inss');
    const products = inss.products.length;
    const banks = countBanks(inss);
    const rules = inss.products.reduce((n,p)=>n+p.banks.reduce((m,b)=>m+b.sections.length,0),0);
    els.content.innerHTML = `<div class="home-hero">
      <div class="hero-card">
        <div class="eyebrow">Base operacional offline</div>
        <h1>Consulte regras por convênio, produto e banco.</h1>
        <p>Esta versão contém somente as informações extraídas dos prints enviados. Novos bancos, produtos e convênios podem ser adicionados posteriormente sem alterar a estrutura do site.</p>
      </div>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${products}</div><div class="stat-label">Produtos INSS cadastrados</div></div>
        <div class="stat-card"><div class="stat-value">${banks}</div><div class="stat-label">Páginas de bancos cadastradas</div></div>
        <div class="stat-card"><div class="stat-value">${rules}</div><div class="stat-label">Blocos de regras organizados</div></div>
      </div>
      <div class="agreement-cards">${data.agreements.map(a => `<button class="agreement-card ${a.products.length?'':'empty'}" data-home-agreement="${esc(a.id)}"><div class="name">${esc(a.name)}</div><div class="meta">${a.products.length ? `${a.products.length} produto(s) • ${countBanks(a)} banco(s)` : 'Aguardando dados'}</div></button>`).join('')}</div>
    </div>`;
    els.content.querySelectorAll('[data-home-agreement]').forEach(btn=>btn.addEventListener('click',()=>selectAgreement(btn.dataset.homeAgreement)));
  }

  function renderEmptyAgreement(agreement){
    els.content.innerHTML = `<div class="empty-state"><div class="empty-icon">＋</div><div class="eyebrow">${esc(agreement.name)}</div><h1>Convênio preparado para receber conteúdo</h1><p>Ainda não há prints cadastrados para este convênio. Quando os próximos materiais forem enviados, os produtos e bancos entrarão neste menu.</p></div>`;
  }

  function renderBankPage(agreement, product, bank){
    if (!bank.sections || !bank.sections.length) {
      els.content.innerHTML = `<div class="page-shell">
        <div class="breadcrumb"><strong>${esc(agreement.name)}</strong><span class="sep">›</span><strong>${esc(product.name)}</strong><span class="sep">›</span><span>${esc(bank.name)}</span></div>
        <div class="page-header"><div><div class="eyebrow">${esc(product.name)} • ${esc(agreement.name)}</div><h1>${esc(bank.name)}</h1><div class="page-lead">Regras apagadas. Estrutura ainda não definida para este produto.</div></div></div>
        <div class="empty-product-rules">Nenhum campo de regra foi criado para este produto por enquanto.</div>
      </div>`;
      return;
    }
    const cards = bank.sections.map(section => {
      const items = section.items || [];
      const body = items.length ? `<ul class="rule-list">${items.map(item=>{
        const value = typeof item === 'object' ? item.text : item;
        const status = typeof item === 'object' ? item.status : null;
        const icon = status === 'yes' ? '<span class="status-icon yes" aria-label="Sim">✓</span>' : status === 'no' ? '<span class="status-icon no" aria-label="Não">✕</span>' : '';
        return `<li class="${section.alert?'danger-text':''} ${status?'status-line':''}">${icon}<span>${esc(value)}</span></li>`;
      }).join('')}</ul>` : `<div class="empty-rule-value">—</div>`;
      const full = !!section.full || (['Fluxo operacional','Portabilidade MÚLTIPLA','Não Porta','Acordos','Demais Bancos','Ponto de Atenção'].includes(section.title) && items.length > 3);
      return `<section class="rule-card ${section.alert?'alert':''} ${full?'full':''}"><h2>${esc(section.title)}</h2>${body}</section>`;
    }).join('');
    els.content.innerHTML = `<div class="page-shell">
      <div class="breadcrumb"><strong>${esc(agreement.name)}</strong><span class="sep">›</span><strong>${esc(product.name)}</strong><span class="sep">›</span><span>${esc(bank.name)}</span></div>
      <div class="page-header"><div><div class="eyebrow">${esc(product.name)} • ${esc(agreement.name)}</div><h1>${esc(bank.name)}</h1><div class="page-lead">${esc(bank.title)}</div></div></div>
      <div class="rule-grid">${cards}</div>
    </div>`;
  }

  function renderContent(){
    const agreement = getAgreement();
    if (!agreement){ renderHome(); return; }
    if (!state.productId || !state.bankId){
      if (agreement.products.length) renderAgreementLanding(agreement); else renderEmptyAgreement(agreement);
      return;
    }
    const product = getProduct(agreement);
    const bank = getBank(product);
    if (!product || !bank){ renderAgreementLanding(agreement); return; }
    renderBankPage(agreement, product, bank);
  }

  function renderAgreementLanding(agreement){
    if (!agreement.products.length){ renderEmptyAgreement(agreement); return; }
    els.content.innerHTML = `<div class="page-shell"><div class="eyebrow">Convênio</div><h1>${esc(agreement.name)}</h1><p class="page-lead">Escolha um produto e um banco no menu lateral, ou use a busca no topo.</p><div class="agreement-cards" style="margin-top:28px">${agreement.products.map(p=>`<button class="agreement-card" data-product-card="${esc(p.id)}"><div class="name">${esc(p.name)}</div><div class="meta">${p.banks.length} banco(s)</div></button>`).join('')}</div></div>`;
    els.content.querySelectorAll('[data-product-card]').forEach(btn=>btn.addEventListener('click',()=>{
      const p = agreement.products.find(x=>x.id===btn.dataset.productCard);
      if(p?.banks?.length){ state.productId=p.id; state.bankId=p.banks[0].id; updateHash(); renderProductNav(); renderContent(); }
    }));
  }

  function selectAgreement(id){
    state.agreementId = id;
    state.productId = null;
    state.bankId = null;
    updateHash();
    renderAgreementNav();
    renderProductNav();
    renderContent();
    clearSearch();
    closeSidebarOnMobile();
  }

  function updateHash(){
    const parts = [state.agreementId, state.productId, state.bankId].filter(Boolean);
    history.replaceState(null,'','#'+parts.join('/'));
  }

  function readHash(){
    const raw = location.hash.replace(/^#/,'');
    if(!raw) return;
    const [a,p,b] = raw.split('/');
    if(data.agreements.some(x=>x.id===a)) state.agreementId=a;
    const ag = getAgreement();
    if(p && ag?.products.some(x=>x.id===p)) state.productId=p;
    const prod = getProduct(ag);
    if(b && prod?.banks.some(x=>x.id===b)) state.bankId=b;
  }

  function snippet(text, query){
    const ntext = normalize(text); const nq = normalize(query); const idx = ntext.indexOf(nq);
    if(idx < 0) return text.slice(0,160);
    const start = Math.max(0, idx-55); const end = Math.min(text.length, idx+query.length+100);
    return (start?'…':'') + text.slice(start,end) + (end<text.length?'…':'');
  }

  function highlight(text, query){
    const safe = esc(text); if(!query) return safe;
    try {
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig');
      return safe.replace(re, m=>`<span class="highlight">${m}</span>`);
    } catch { return safe; }
  }

  function handleSearch(){
    const q = els.search.value.trim();
    if(!q){ clearSearch(); return; }
    const nq = normalize(q);
    const matches = state.searchIndex.filter(x=>x.normalized.includes(nq)).slice(0,30);
    els.searchResults.classList.remove('hidden');
    els.searchResults.innerHTML = `<div class="search-results-header">${matches.length} resultado(s) para “${esc(q)}”</div>${matches.length ? matches.map((m,i)=>`<button class="search-result-item" data-result="${i}"><div class="search-result-title">${highlight(m.title,q)}</div><div class="search-result-path">${esc(m.path)}</div><div class="search-result-snippet">${highlight(snippet(m.text,q),q)}</div></button>`).join('') : `<div style="padding:18px;color:#667085">Nenhuma regra encontrada.</div>`}`;
    els.searchResults.querySelectorAll('[data-result]').forEach(btn=>btn.addEventListener('click',()=>{
      const m=matches[Number(btn.dataset.result)];
      state.agreementId=m.agreementId;state.productId=m.productId;state.bankId=m.bankId;
      updateHash();renderAgreementNav();renderProductNav();renderContent();clearSearch();
      window.scrollTo({top:0,behavior:'smooth'});
    }));
  }

  function clearSearch(){
    els.searchResults.classList.add('hidden');
    els.searchResults.innerHTML='';
  }

  function closeSidebarOnMobile(){
    els.sidebar.classList.remove('open');
    els.sidebarScrim.classList.remove('show');
  }

  els.menuButton.addEventListener('click',()=>{
    els.sidebar.classList.toggle('open');
    els.sidebarScrim.classList.toggle('show');
  });
  els.sidebarScrim.addEventListener('click',closeSidebarOnMobile);
  els.search.addEventListener('input',handleSearch);
  els.search.addEventListener('keydown',e=>{ if(e.key==='Escape'){els.search.value='';clearSearch();els.search.blur();} });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();els.search.focus();els.search.select();
    }
  });

  readHash();
  buildSearchIndex();
  renderAgreementNav();
  renderProductNav();
  renderContent();
})();
