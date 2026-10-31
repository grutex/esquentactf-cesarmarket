/* Cesar Market - componentes em HTML e integração com a API PHP. */
window.MercadoPronto = (async () => {
  'use strict';
  const api = window.MarketAPI;
  if (location.protocol === 'file:') {
    document.querySelector('main').innerHTML = '<div class="container page-top"><h1>Abra o mercado pelo servidor<span class="accent">.</span></h1><p>Inicie o Docker Compose e acesse http://localhost:8081. As contas, produtos e compras agora são carregados pelo backend.</p></div>';
    return null;
  }
  const dados = await api.bootstrap();
  const pagina = document.body.dataset.pagina;
  const parametros = new URLSearchParams(location.search);
  const consultaCatalogo = pagina === 'produtos' ? new URLSearchParams({page:parametros.get('page') || '1', limit:parametros.get('limit') || '10'}) : null;
  if (consultaCatalogo) consultaCatalogo.set('q', parametros.get('q') || '');
  if (consultaCatalogo) dados.products = await api.request(`/products?${consultaCatalogo}`);
  let produtos = dados.products;
  let produtoAtual = produtos.find(p => p.slug === (parametros.get('id') || 'abacate'));
  const texto = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const decimal = valor => Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dinheiro = valor => `R$ ${decimal(valor)}`;
  const imagem = arquivo => /^\/uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(arquivo) ? arquivo : `/imagens/${encodeURIComponent(arquivo)}`;
  const urlProduto = produto => `/produto?id=${encodeURIComponent(produto.slug)}`;
  const urlCategoria = slug => slug === 'hortifruti' ? '/hortifruti' : `/produtos?categoria=${encodeURIComponent(slug)}`;
  const produtoPorSlug = slug => produtos.find(p => p.slug === slug);
  const quantidadeCategoria = slug => produtos.filter(p => p.category_slug === slug).length;

  // Componentes compartilhados: edite o HTML destes modelos para alterar todas as páginas.
    const modeloIcones = `<svg class="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <symbol id="icon-basket" viewBox="0 0 24 24"><path d="m4 9 3.5-6M20 9l-3.5-6M2 9h20l-2 11H4L2 9Z"></path><path d="M8 12v5m4-5v5m4-5v5"></path></symbol>
    <symbol id="icon-search" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></symbol>
    <symbol id="icon-pin" viewBox="0 0 24 24"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"></path><circle cx="12" cy="10" r="2.2"></circle></symbol>
    <symbol id="icon-user" viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="3.5"></circle><path d="M5 21v-2a7 7 0 0 1 14 0v2"></path></symbol>
    <symbol id="icon-arrow" viewBox="0 0 24 24"><path d="M4 12h15m-5-5 5 5-5 5"></path></symbol>
    <symbol id="icon-arrow-up" viewBox="0 0 24 24"><path d="M6 18 18 6M6 6h12v12"></path></symbol>
    <symbol id="icon-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"></path></symbol>
    <symbol id="icon-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></symbol>
    <symbol id="icon-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></symbol>
    <symbol id="icon-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></symbol>
    <symbol id="icon-minus" viewBox="0 0 24 24"><path d="M5 12h14"></path></symbol>
    <symbol id="icon-truck" viewBox="0 0 24 24"><path d="M2 5h12v12H2zM14 9h4l4 5v3h-8"></path><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle></symbol>
    <symbol id="icon-leaf" viewBox="0 0 24 24"><path d="M20 3C8 2 2 9 6 16s15 3 14-13Z"></path><path d="M3 21 16 8M9 15V9m0 6h6"></path></symbol>
    <symbol id="icon-bag" viewBox="0 0 24 24"><path d="M5 7h14l1 14H4L5 7Z"></path><path d="M8 8V6a4 4 0 0 1 8 0v2"></path></symbol>
    <symbol id="icon-shield" viewBox="0 0 24 24"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"></path><path d="m8 12 3 3 5-6"></path></symbol>
    <symbol id="icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 6v6l4 2"></path></symbol>
    <symbol id="icon-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></symbol>
    <symbol id="icon-filter" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"></path><circle cx="8" cy="6" r="2" fill="currentColor"></circle><circle cx="16" cy="12" r="2" fill="currentColor"></circle><circle cx="9" cy="18" r="2" fill="currentColor"></circle></symbol>
    <symbol id="icon-trash" viewBox="0 0 24 24"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"></path></symbol>
    <symbol id="icon-lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"></path></symbol>
    <symbol id="icon-card" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M2 9h20M6 15h4"></path></symbol>
    <symbol id="icon-pix" viewBox="0 0 24 24"><path d="m12 2 7 7-7 7-7-7 7-7Zm0 6 7 7-7 7-7-7 7-7Z"></path></symbol>
    <symbol id="icon-check" viewBox="0 0 24 24"><path d="m5 12 4 4L20 5"></path></symbol>
    <symbol id="icon-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1.3.7-1.5 1-1.5 2.5M12 17h.01"></path></symbol>
    <symbol id="icon-heart" viewBox="0 0 24 24"><path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-9.3a5 5 0 0 0 0-7.1Z"></path></symbol>
    <symbol id="icon-camera" viewBox="0 0 24 24"><path d="M8 5 9 3h6l1 2h5v16H3V5h5Z"></path><circle cx="12" cy="12" r="4"></circle></symbol>
    <symbol id="icon-wallet" viewBox="0 0 24 24"><path d="M20 8V5H5a3 3 0 0 1 0-6" transform="translate(0 4)"></path><path d="M3 6v13a2 2 0 0 0 2 2h15V8H5a2 2 0 0 1-2-2Z"></path><path d="M20 12h-5v5h5M16.5 14.5h.01"></path></symbol>
  </defs>
</svg>`;

  const modeloCabecalho = `<div class="utility-bar"><div class="container utility-content"><p><span>●</span> Bons ingredientes. Bons momentos. Todo dia.</p><div class="utility-links"><a href="/#como-funciona">Como funciona</a><a href="/#atendimento">Precisa de ajuda?</a></div></div></div><header class="site-header">
  <div class="container header-main">
    <a class="brand" href="/" aria-label="Cesar Market, página inicial"><span class="brand-mark"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-basket"></use></svg></span><span class="brand-name"><strong>Cesar</strong><span>Market</span></span></a>
    <div class="header-location"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-pin"></use></svg><div><small>Entregar em</small><strong></strong></div></div>
    <form class="header-search" role="search" action="/produtos" method="get"><svg class="icon icon-small" aria-hidden="true" focusable="false"><use href="#icon-search"></use></svg><label class="sr-only" for="busca">Buscar no mercado</label><input id="busca" name="q" type="search" placeholder="O que vai para a sua sacola hoje?" autocomplete="off"></form>
    <a class="header-account" href="/login" aria-label="Minha conta"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-user"></use></svg><span><span>Olá, visitante</span><strong>Minha conta</strong></span></a>
<details class="wallet" name="header-modules">
  <summary class="wallet-summary" aria-label="Abrir carteira"><span class="wallet-icon"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-wallet"></use></svg></span><span class="wallet-header-copy"><span class="wallet-label">Sua carteira</span><strong class="wallet-total"></strong></span></summary>
  <section class="wallet-panel" aria-labelledby="titulo-carteira">
    <div class="wallet-panel-heading"><h2 id="titulo-carteira">Sua carteira</h2><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-wallet"></use></svg></div>
    <div class="wallet-balance"><span>Saldo disponível</span><strong></strong><small>Para as suas próximas boas escolhas.</small></div>
    <p class="wallet-description">Use o saldo da sua carteira como forma de pagamento no checkout.</p>
    <a class="button button-wide" href="/checkout#pagamento">Ver no checkout <svg class="icon icon-small" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
  </section>
</details>
<details class="basket" name="header-modules">
  <summary class="basket-summary" aria-label="Abrir prévia da sacola"><span class="basket-icon"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-bag"></use></svg><span class="basket-count"></span></span><span><span class="basket-label">Sua sacola</span><strong class="basket-total"></strong></span></summary>
  <div class="basket-panel"><h2>Sua sacola <span></span></h2><div class="basket-items"></div>
    



    <div class="summary-line"><span>Subtotal</span><strong></strong></div>
    <a class="button button-wide" href="/carrinho">Ver minha sacola <svg class="icon icon-small" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a><a class="text-link" href="/checkout">Ir para o checkout <svg class="icon icon-small" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a>
  </div>
</details>
  </div>
  <nav class="navigation" aria-label="Navegação principal"><div class="container nav-content"><div class="nav-links">
    <a href="/categorias"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-menu"></use></svg> Categorias</a>
    <a href="/">Início</a>
    <a href="/produtos">Todos os produtos</a>
    <a href="/hortifruti">Hortifruti</a>
    <a href="/produtos#ofertas">Ofertas da semana</a>
  </div><span class="nav-caption"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-leaf"></use></svg> Frescor que faz parte do seu dia</span></div></nav>
</header>`;

  const modeloRodape = `<footer class="site-footer">
  <div class="container footer-main">
    <div class="footer-brand"><a class="brand" href="/" aria-label="Cesar Market, página inicial"><span class="brand-mark"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-basket"></use></svg></span><span class="brand-name"><strong>Cesar</strong><span>Market</span></span></a><p>Da feira à despensa, boas escolhas para a sua casa e para os seus melhores momentos.</p><div class="footer-labs"><span>Preso?</span><span class="footer-labs-arrow" aria-hidden="true">→</span><a class="button footer-labs-button" href="${texto(dados.links?.ctfd_tutorials || 'http://localhost/tutorials')}" target="_blank" rel="noopener noreferrer" aria-label="Laboratórios (abre em outra aba)">Laboratórios <svg class="icon icon-small" aria-hidden="true"><use href="#icon-arrow-up"></use></svg></a></div></div>
    <div><h2>Encontre o que precisa</h2><nav class="footer-links" aria-label="Departamentos"><a href="/hortifruti">Hortifruti</a><a href="/produtos?categoria=padaria">Padaria</a><a href="/produtos?categoria=mercearia">Mercearia</a><a href="/categorias">Todas as categorias</a></nav></div>
    <div><h2>Conte com a gente</h2><nav class="footer-links" aria-label="Ajuda"><a href="/#como-funciona">Como comprar</a><a href="/#atendimento">Perguntas frequentes</a><a href="/carrinho">Minha sacola</a><a href="/checkout">Entrega e pagamento</a></nav></div>
    <div><h2>Do seu jeito</h2><div class="footer-promise"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-leaf"></use></svg> Escolhas que combinam com você</div><div class="footer-promise"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-heart"></use></svg> Cuidado em cada detalhe</div><div class="payment-marks" aria-label="Formas de pagamento"><span>PIX</span><span>VISA</span><span>mastercard</span></div></div>
  </div>
  <div class="container footer-bottom"><p>© 2026 Cesar Market. Feito para o seu dia a dia.</p><span><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-leaf"></use></svg> Pequenas escolhas, bons momentos.</span></div>
</footer>`;

  const modeloPromocao = `<section class="container responsive-promo" aria-labelledby="titulo-qualquer-tela">
  <div class="promo-copy"><p class="eyebrow">Perto de você, onde estiver</p><h2 id="titulo-qualquer-tela">Seu mercado favorito.<br><span class="accent">Em qualquer tela.</span></h2><p>No computador, no celular ou no tablet: leve suas boas escolhas com você e encontre tudo no seu tempo.</p><a class="text-link" href="/produtos">Encontre seus favoritos <svg class="icon icon-small" aria-hidden="true" focusable="false"><use href="#icon-arrow"></use></svg></a></div>
  <div class="promo-phones" aria-hidden="true">
    <div class="phone"><div class="phone-notch"></div><div class="phone-brand"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-basket"></use></svg> Cesar Market</div><img class="phone-image" src="/imagens/basket.jpg" alt=""><span class="phone-caption">Seu dia começa fresquinho.</span><div class="phone-products"><div><img src="/imagens/avocado.jpg" alt=""><b>Abacate fresco</b></div><div><img src="/imagens/strawberry.jpg" alt=""><b>Morango selecionado</b></div></div><div class="phone-button"></div></div>
    <div class="phone"><div class="phone-notch"></div><div class="phone-brand"><svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-basket"></use></svg> Cesar Market</div><img class="phone-image" src="/imagens/market.jpg" alt=""><span class="phone-caption">Escolhas para a sua casa.</span><div class="phone-products"><div><img src="/imagens/avocado.jpg" alt=""><b>Abacate fresco</b></div><div><img src="/imagens/strawberry.jpg" alt=""><b>Morango selecionado</b></div></div><div class="phone-button"></div></div>
  </div>
</section>`;

  function icone(nome, pequeno = false) {
    return `<svg class="icon${pequeno ? ' icon-small' : ''}" aria-hidden="true"><use href="#icon-${texto(nome)}"></use></svg>`;
  }
  function preencherTexto(seletor, valor) { document.querySelectorAll(seletor).forEach(el => { el.textContent = valor; }); }
  function substituirComponente(id, html) { const el = document.getElementById(id); if (el) el.outerHTML = html; }
  function toast(mensagem, erro = false) {
    let el = document.getElementById('aviso');
    if (!el) { el = document.createElement('div'); el.id = 'aviso'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.className = `toast${erro ? ' toast-error' : ''}`; el.textContent = mensagem;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.className = 'toast hidden'; }, 6500);
  }
  function entrar() { location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`; }
  function tratarErro(error, alvo) {
    if (error.status === 401) { entrar(); return; }
    if (alvo) { alvo.textContent = error.message; alvo.hidden = false; alvo.focus(); }
    else toast(error.message, true);
  }
  function itensDaSacola() {
    return dados.cart.lines.map(l => `<div class="basket-item"><a href="/produto?id=${texto(l.product_slug)}"><img src="${imagem(l.image)}" alt="${texto(l.name)}" width="54" height="54"></a><div><strong>${texto(l.name)}</strong><small>${l.quantity} un. · ${texto(l.unit)}</small></div><span>${dinheiro(l.subtotal)}</span></div>`).join('') || '<p class="empty-inline">Sua sacola está esperando suas boas escolhas.</p>';
  }
  function atualizarCabecalho() {
    preencherTexto('.header-account > span > span', dados.user.greeting);
    preencherTexto('.header-account strong', dados.user.account_label);
    document.querySelector('.header-account').href = dados.current_user ? '/conta' : '/login';
    preencherTexto('.wallet-total, .wallet-balance > strong', dinheiro(dados.wallet.balance));
    preencherTexto('.basket-count', dados.cart.count);
    preencherTexto('.basket-total, .basket-panel .summary-line strong', dinheiro(dados.cart.subtotal));
    preencherTexto('.basket-panel > h2 > span', `${dados.cart.count} ${dados.cart.count === 1 ? 'item' : 'itens'}`);
    document.querySelector('.basket-items').innerHTML = itensDaSacola();
    const nav = document.querySelector('.utility-links');
    nav.querySelectorAll('[data-role-link]').forEach(el => el.remove());
    if (dados.current_user?.role === 'admin') nav.insertAdjacentHTML('afterbegin', '<a data-role-link href="/admin">Painel administrativo</a>');
    else if (dados.current_user?.role === 'moderator') nav.insertAdjacentHTML('afterbegin', '<a data-role-link href="/gerenciar">Gerenciar catálogo</a>');
  }
  function iniciarComponentes() {
    substituirComponente('icones', modeloIcones);
    substituirComponente('cabecalho', modeloCabecalho);
    substituirComponente('rodape', modeloRodape);
    substituirComponente('promocao', modeloPromocao);
    preencherTexto('.brand-name strong', dados.site.brand_name);
    preencherTexto('.brand-name > span', dados.site.brand_suffix);
    preencherTexto('.header-location strong', `${dados.delivery.city}, ${dados.delivery.state}`);
    atualizarCabecalho();
    const ativo = ({index:'/', categorias:'/categorias', produtos:'/produtos', hortifruti:'/hortifruti'})[pagina];
    document.querySelectorAll('.nav-links a').forEach(link => { if (link.getAttribute('href') === ativo) link.setAttribute('aria-current', 'page'); });
  }
  function renderizarCategorias() {
    document.querySelectorAll('[data-categorias]').forEach(el => {
      const tipo = el.dataset.categorias;
      let html = tipo === 'filtros' ? `<a href="/produtos">Todos os produtos <span>${produtos.length}</span></a>` : '';
      html += dados.categories.map(c => {
        const total = quantidadeCategoria(c.slug); const rotulo = `${total} ${total === 1 ? 'produto' : 'produtos'}`;
        if (tipo === 'resumo') return `<a class="category-card" href="${urlCategoria(c.slug)}">${icone('arrow-up')}<img class="category-picture" src="${imagem(c.image)}" alt="" width="65" height="65" loading="lazy"><strong>${texto(c.name)}</strong><span>${rotulo}</span></a>`;
        if (tipo === 'completo') return `<a class="department" href="${urlCategoria(c.slug)}"><img src="${imagem(c.image)}" alt="${texto(c.name)}" loading="lazy"><div class="department-body"><div><h2>${texto(c.name)}</h2>${icone('arrow-up')}</div><p>${texto(c.description)}</p><span class="text-link">Explorar ${rotulo} ${icone('arrow', true)}</span></div></a>`;
        const selecionada = pagina === 'hortifruti' ? 'hortifruti' : parametros.get('categoria');
        return `<a href="${urlCategoria(c.slug)}"${selecionada === c.slug ? ' aria-current="page"' : ''}>${texto(c.name)}<span>${total}</span></a>`;
      }).join('');
      el.innerHTML = html;
    });
    if (pagina === 'categorias') preencherTexto('.page-counter', `${dados.categories.length} departamentos para explorar`);
  }
  function cardProduto(p) {
    const selo = p.tag ? `<span class="product-tag${p.tag.startsWith('-') ? '' : ' subtle'}">${texto(p.tag)}</span>` : '';
    const nome = `<h3><a href="${urlProduto(p)}">${texto(p.name)}</a></h3>`;
    return `<article class="product-card" data-product-slug="${texto(p.slug)}"><a class="product-image-link" href="${urlProduto(p)}" aria-label="Ver ${texto(p.name)}"><img src="${imagem(p.image)}" width="680" height="510" alt="${texto(p.name)}" loading="lazy">${selo}</a><div class="product-body"><span class="product-category">${texto(p.category)}</span>${nome}<span class="product-unit">${texto(p.unit)}</span><div class="product-price-row"><div><div class="product-old-price">${p.old ? dinheiro(p.old) : '&nbsp;'}</div><div class="product-price"><small>R$</small>${decimal(p.price)}</div></div><button class="product-add" data-add="${texto(p.slug)}" type="button" ${p.stock < 1 ? 'disabled' : ''} aria-label="Adicionar ${texto(p.name)} à sacola">${icone('plus')}</button></div>${p.stock < 1 ? '<small class="muted">Sem estoque</small>' : ''}</div></article>`;
  }
  function listaFiltrada(tipo) {
    let lista = [...produtos];
    if (tipo === 'hortifruti') lista = lista.filter(p => p.category_slug === 'hortifruti');
    const categoria = parametros.get('categoria') || (dados.categories.some(c => c.slug === location.hash.slice(1)) ? location.hash.slice(1) : '');
    if (tipo === 'todos' && categoria) lista = lista.filter(p => p.category_slug === categoria);
    const query = (parametros.get('q') || '').trim().toLocaleLowerCase('pt-BR');
    if (query) lista = lista.filter(p => `${p.name} ${p.category} ${p.description}`.toLocaleLowerCase('pt-BR').includes(query));
    const preferencias = parametros.getAll('preferencia');
    if (preferencias.includes('ofertas') || location.hash === '#ofertas') lista = lista.filter(p => p.old);
    if (preferencias.includes('frescos')) lista = lista.filter(p => p.category_slug === 'hortifruti');
    if (preferencias.includes('naturais')) lista = lista.filter(p => ['naturais', 'hortifruti'].includes(p.category_slug));
    const minimo = parametros.get('preco-min'); const maximo = parametros.get('preco-max');
    if (minimo) lista = lista.filter(p => Number(p.price) >= Number(minimo));
    if (maximo) lista = lista.filter(p => Number(p.price) <= Number(maximo));
    const ordem = document.querySelector('[name=ordenacao]')?.selectedIndex || 0;
    if (ordem) lista.sort((a, b) => (Number(a.price) - Number(b.price)) * (ordem === 1 ? 1 : -1));
    return lista;
  }
  function renderizarProdutos() {
    const busca = parametros.get('q') || '';
    const resumoBusca = document.querySelector('.catalog-intro');
    if (pagina === 'produtos' && busca && resumoBusca && !document.querySelector('[data-resumo-busca]')) {
      const resumo = document.createElement('p'); resumo.className = 'muted'; resumo.dataset.resumoBusca = ''; resumo.textContent = `Pesquisa: ${busca}`; resumoBusca.insertAdjacentElement('afterend', resumo);
    }
    document.querySelectorAll('[data-produtos]').forEach(el => {
      const tipo = el.dataset.produtos;
      const lista = ['todos', 'hortifruti'].includes(tipo) ? listaFiltrada(tipo) : ({
        destaques: dados.featured_product_slugs.map(produtoPorSlug).filter(Boolean),
        sugestoes: dados.cart_recommendation_slugs.map(produtoPorSlug).filter(Boolean),
        relacionados: produtos.filter(p => p.slug !== produtoAtual?.slug).slice(0, 4)
      })[tipo] || [];
      el.innerHTML = lista.map(cardProduto).join('') || '<p class="empty-inline">Nenhum produto encontrado com esses filtros.</p>';
      if (['todos', 'hortifruti'].includes(tipo)) {
        preencherTexto('.page-counter', `${lista.length} produtos nesta seleção`);
        preencherTexto('.catalog-intro > p > strong', `${lista.length} produtos`);
        preencherTexto('.catalog-bottom > p', `Você viu todos os ${lista.length} produtos desta seleção.`);
        document.querySelectorAll('.page-number').forEach(el => { const numero = Number(parametros.get('page') || 1); el.textContent = numero; el.setAttribute('aria-label', `Página ${numero}`); });
      }
    });
  }
  function renderizarProduto() {
    if (pagina !== 'produto') return;
    if (!produtoAtual) { document.querySelector('main').innerHTML = '<div class="container page-top"><h1>Produto não encontrado.</h1><a class="button" href="/produtos">Voltar ao catálogo</a></div>'; return; }
    const p = produtoAtual;
    document.title = `${p.name} | Cesar Market`;
    document.querySelectorAll('.product-gallery img').forEach(img => { img.src = imagem(p.image); img.alt = p.name; });
    preencherTexto('.product-info > .eyebrow', `${p.category} · Seleção Cesar`);
    preencherTexto('.product-info > h1', p.name);
    preencherTexto('.product-info > .product-unit', p.unit);
    preencherTexto('.product-info .stock', p.stock ? `${p.stock} unidades disponíveis` : 'Sem estoque no momento');
    preencherTexto('.detail-price > .product-old-price', p.old ? dinheiro(p.old) : '');
    document.querySelector('.detail-price > .product-price').innerHTML = `<small>R$</small>${decimal(p.price)}`;
    preencherTexto('.product-info > .product-description', p.description);
    preencherTexto('.detail-accordions details:first-child p', `${p.description} Referência: ${p.sku}.`);
    preencherTexto('.detail-accordions details:nth-child(2) p', p.storage || 'Consulte as orientações na embalagem.');
    const form = document.querySelector('.purchase-controls'); form.elements.product_slug.value = p.slug;
    const input = form.elements.quantity; input.type = 'number'; input.readOnly = false; input.min = 1; input.max = Math.min(100, p.stock); input.value = 1;
    form.querySelectorAll('button').forEach(el => { el.disabled = p.stock < 1; });
    form.querySelector('[aria-label="Diminuir quantidade"]').dataset.step = -1;
    form.querySelector('[aria-label="Aumentar quantidade"]').dataset.step = 1;
    document.querySelector('.breadcrumb').innerHTML = `<a href="/">Início</a>${icone('chevron')}<a href="${urlCategoria(p.category_slug)}">${texto(p.category)}</a>${icone('chevron')}<span>${texto(p.name)}</span>`;
  }
  function renderizarSacola() {
    const tabela = document.querySelector('[data-itens-sacola]'); if (!tabela) return;
    tabela.querySelectorAll('.cart-row, .empty-inline').forEach(el => el.remove());
    tabela.insertAdjacentHTML('beforeend', dados.cart.lines.map(l => `<article class="cart-row" data-product-slug="${texto(l.product_slug)}"><div class="cart-product"><a href="/produto?id=${texto(l.product_slug)}"><img src="${imagem(l.image)}" alt="${texto(l.name)}" width="82" height="82"></a><div><h2>${texto(l.name)}</h2><p>${texto(l.unit)}</p><span class="small">${dinheiro(l.price)} por item</span></div></div><div class="quantity"><button type="button" data-cart-step="-1" aria-label="Diminuir ${texto(l.name)}">${icone('minus')}</button><input type="text" value="${l.quantity}" readonly aria-label="Quantidade de ${texto(l.name)}"><button type="button" data-cart-step="1" aria-label="Aumentar ${texto(l.name)}" ${l.quantity >= Math.min(100, l.stock) ? 'disabled' : ''}>${icone('plus')}</button></div><strong>${dinheiro(l.subtotal)}</strong><button class="remove-item" type="button" data-remove aria-label="Remover ${texto(l.name)}">${icone('trash')}</button></article>`).join('') || '<p class="empty-inline">Sua sacola está vazia. <a class="text-link" href="/produtos">Explorar produtos →</a></p>');
    preencherTexto('.page-counter', `${dados.cart.count} itens selecionados`);
    preencherTexto('.cart-continue .small', `${dados.cart.count} itens · suas próximas boas escolhas`);
  }
  function renderizarResumo() {
    const antigo = document.getElementById('resumo-pedido') || document.querySelector('.order-summary'); if (!antigo) return;
    const checkout = pagina === 'checkout'; const c = dados.cart;
    const botao = checkout ? `<button class="button button-wide" type="submit" form="checkout-form" ${!c.count ? 'disabled' : ''}>Finalizar pedido ${icone('arrow', true)}</button>` : c.count ? `<a class="button button-wide" href="/checkout">Continuar para entrega ${icone('arrow', true)}</a>` : '<a class="button button-wide" href="/produtos">Explorar o catálogo</a>';
    antigo.outerHTML = `<aside class="order-summary" aria-labelledby="titulo-resumo"><h2 id="titulo-resumo">Resumo do pedido</h2>${checkout ? `<div class="checkout-summary-products">${itensDaSacola()}</div>` : ''}<div class="summary-line"><span>Subtotal (${c.count} itens)</span><strong>${dinheiro(c.subtotal)}</strong></div>${c.discount_cents ? `<div class="summary-line accent"><span>Desconto · ${texto(c.coupon)}</span><strong>− ${dinheiro(c.discount)}</strong></div>` : ''}<div class="summary-line"><span>Entrega</span><strong>${dinheiro(c.delivery_fee)}</strong></div><div class="summary-line summary-total"><span>Total</span><strong>${dinheiro(c.total)}</strong></div><p class="summary-caption">Valores em reais, com impostos inclusos.</p>${botao}<p class="summary-note">${icone('bag')} Boas escolhas para a sua casa</p>${checkout ? '<p class="checkout-terms">Pagamento exclusivo com saldo virtual da Carteira Cesar.</p>' : `<div class="coupon"><label class="sr-only" for="cupom">Cupom de desconto</label><input id="cupom" placeholder="Tem um cupom?" value="${texto(c.coupon || '')}"><button type="button" data-coupon>Aplicar</button></div>`}</aside>`;
  }
  function renderizarCheckout() {
    if (pagina !== 'checkout') return;
    if (!dados.current_user) { entrar(); return; }
    const form = document.getElementById('checkout-form');
    // O HTML já fornece dados fictícios editáveis para finalizar sem preencher o formulário.
    document.querySelector('.delivery-options').innerHTML = dados.checkout.delivery_options.map(o => `<label class="delivery-option"><input type="radio" name="entrega" value="${texto(o.id)}"${o.id === dados.checkout.default_delivery ? ' checked' : ''}><span><strong>${texto(o.label)}</strong><small>${texto(o.description)}</small><b>${dinheiro(dados.cart.delivery_fee)}</b></span></label>`).join('');
    // Pix e cartão continuam visíveis em manutenção; somente a carteira pode ser selecionada.
    document.querySelector('.payment-options').innerHTML = dados.checkout.payment_methods.map(m => {
      const carteira = m.id === 'carteira';
      return `<label class="payment-option${carteira ? ' payment-wallet' : ' payment-unavailable'}"${carteira ? '' : ' aria-disabled="true"'}><input type="radio" name="pagamento" value="${texto(m.id)}"${carteira ? ' checked' : ' disabled'}>${icone(m.icon)}<div><strong>${texto(m.label)}</strong><small>${carteira ? `Saldo virtual: ${dinheiro(dados.wallet.balance)}` : 'Temporariamente indisponível'}</small></div>${carteira ? '' : '<span class="payment-maintenance" aria-hidden="true">manutenção</span>'}</label>`;
    }).join('');
    form.insertAdjacentHTML('afterbegin', '<p class="form-error" role="alert" tabindex="-1" hidden></p>');
  }
  async function atualizar() {
    Object.assign(dados, await api.bootstrap(true));
    if (consultaCatalogo) dados.products = await api.request(`/products?${consultaCatalogo}`);
    produtos = dados.products;
    produtoAtual = produtoPorSlug(parametros.get('id') || 'abacate');
    atualizarCabecalho(); renderizarSacola(); renderizarResumo(); renderizarProdutos();
  }
  async function adicionar(slug, quantity, botao) {
    if (!dados.current_user) { entrar(); return; }
    botao.disabled = true;
    try { await api.request('/cart', { method: 'POST', body: {product_slug: slug, quantity} }); await atualizar(); toast('Produto adicionado à sua sacola.'); }
    catch (error) { tratarErro(error); }
    finally { botao.disabled = false; }
  }
  iniciarComponentes(); renderizarCategorias(); renderizarProduto(); renderizarProdutos(); renderizarSacola(); renderizarResumo(); renderizarCheckout();
  document.querySelectorAll('.catalog-sidebar button, [name=ordenacao]').forEach(el => { el.disabled = false; });
  const filtro = document.querySelector('.catalog-sidebar form');
  if (filtro) {
    for (const campo of ['categoria', 'q']) if (parametros.has(campo)) { const i = document.createElement('input'); i.type = 'hidden'; i.name = campo; i.value = parametros.get(campo); filtro.append(i); }
    filtro.querySelectorAll('input').forEach(i => { if (i.type === 'checkbox') i.checked = parametros.getAll(i.name).includes(i.value); else if (parametros.has(i.name)) i.value = parametros.get(i.name); });
  }
  document.querySelector('[name=ordenacao]')?.addEventListener('change', renderizarProdutos);
  window.addEventListener('hashchange', renderizarProdutos);
  document.querySelector('#busca').value = parametros.get('q') || '';
  document.addEventListener('click', async event => {
    const add = event.target.closest('[data-add]'); if (add) { await adicionar(add.dataset.add, 1, add); return; }
    const step = event.target.closest('[data-step]');
    if (step) { const i = step.closest('.quantity').querySelector('input'); i.value = Math.min(Number(i.max), Math.max(1, Number(i.value) + Number(step.dataset.step))); return; }
    const carrinho = event.target.closest('[data-cart-step], [data-remove]');
    if (carrinho) {
      carrinho.disabled = true;
      const slug = carrinho.closest('[data-product-slug]').dataset.productSlug;
      const linha = dados.cart.lines.find(l => l.product_slug === slug);
      const quantity = linha.quantity + Number(carrinho.dataset.cartStep || 0);
      const remover = carrinho.hasAttribute('data-remove') || quantity < 1;
      try { await api.request(`/cart/${encodeURIComponent(slug)}`, {method: remover ? 'DELETE' : 'PATCH', body: remover ? undefined : {quantity}}); await atualizar(); }
      catch(error) { carrinho.disabled = false; tratarErro(error); }
    }
    const cupom = event.target.closest('[data-coupon]');
    if (cupom) { cupom.disabled = true; try { await api.request('/cart/coupon', {method:'POST', body:{code:document.getElementById('cupom').value}}); await atualizar(); toast('Cupom aplicado.'); } catch(error) { tratarErro(error); } finally {cupom.disabled = false;} }
  });
  document.querySelector('.purchase-controls')?.addEventListener('submit', async event => { event.preventDefault(); const f = event.currentTarget; await adicionar(f.elements.product_slug.value, Number(f.elements.quantity.value), f.querySelector('[type=submit]')); });
  document.getElementById('checkout-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const f = new FormData(form);
    const erro = form.querySelector('.form-error'); erro.hidden = true;
    const botao = document.querySelector('[form=checkout-form]'); if (botao.disabled) return; botao.disabled = true;
    try {
      const pedido = await api.request('/orders', {method:'POST', body:{
        request_key:dados.checkout_token, payment_method:f.get('pagamento'), delivery_method:f.get('entrega'),
        items:dados.cart.lines.map(item => ({product_id:item.product_id})),
        customer:{name:f.get('nome'), email:f.get('email'), phone:f.get('telefone'), document:f.get('cpf') || ''},
        address:{zip:f.get('cep'), city:f.get('cidade'), street:f.get('rua'), number:f.get('numero'), complement:f.get('complemento') || '', district:f.get('bairro'), state:f.get('estado')}, notes:f.get('observacoes') || ''
      }});
      location.href = `/pedido?id=${encodeURIComponent(pedido.id)}`;
    } catch(error) { tratarErro(error, erro); botao.disabled = false; }
  });
  return {dados, api, texto, dinheiro, imagem, icone, toast, tratarErro, entrar, atualizar};
})().catch(error => {
  const el = document.querySelector('main');
  if (el) { el.innerHTML = '<div class="container page-top"><h1>O mercado está indisponível.</h1><p>Confira se os serviços Docker estão iniciados e tente atualizar a página.</p></div>'; }
  console.error(error);
  return null;
});
