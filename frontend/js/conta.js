/* Login, cadastro, conta e pedidos; nenhuma credencial é salva no navegador. */
(async () => {
  'use strict';
  const app = await window.MercadoPronto; if (!app) return;
  const {dados, api, texto, dinheiro, toast, tratarErro, entrar} = app;
  const pagina = document.body.dataset.pagina;
  const params = new URLSearchParams(location.search);
  const candidato = params.get('next') || '/conta';
  const legado = candidato.replace(/^\/?index(?:\.html)?(?=\?|$)/, '/').replace(/\.html(?=\?|$)/, '');
  const caminho = legado.startsWith('/') ? legado : `/${legado}`;
  const next = /^\/(?:categorias|produtos|hortifruti|produto|carrinho|checkout|conta|pedido|admin|gerenciar)?(?:\?[^\s\\#]*)?$/.test(caminho) ? caminho : '/conta';
  document.querySelectorAll('[data-preservar-next]').forEach(a => { a.href += `?next=${encodeURIComponent(next)}`; });
  if (['login', 'cadastro'].includes(pagina) && dados.current_user) { location.replace(next); return; }
  for (const [id, path] of [['login-form', '/auth/login'], ['cadastro-form', '/auth/register'], ['senha-form', '/account/password']]) {
    document.getElementById(id)?.addEventListener('submit', async event => {
      event.preventDefault(); const form = event.currentTarget; const botao = form.querySelector('[type=submit]');
      const erro = form.querySelector('.form-error'); erro.hidden = true; botao.disabled = true;
      try {
        await api.request(path, {method: id === 'senha-form' ? 'PUT' : 'POST', body: Object.fromEntries(new FormData(form))});
        if (id === 'senha-form') { form.reset(); toast('Sua senha foi atualizada.'); }
        else location.replace(next);
      } catch(error) {
        // Erro de senha no login precisa permanecer no próprio formulário.
        erro.textContent = error.message; erro.hidden = false; erro.focus();
      } finally { botao.disabled = false; }
    });
  }
  if (!['conta', 'pedido'].includes(pagina)) return;
  if (!dados.current_user) { entrar(); return; }
  const data = value => new Date(value.replace(' ', 'T') + 'Z').toLocaleString('pt-BR');
  const pagamento = method => ({carteira:'Carteira Cesar', pix:'Pix', cartao:'Cartão'})[method] || method;
  const status = value => value === 'paid' ? 'Pago com saldo virtual' : 'Pagamento simulado';
  if (pagina === 'conta') {
    document.querySelector('[data-account-name]').textContent = `${dados.current_user.name} · ${dados.current_user.login}`;
    document.querySelector('[data-account-balance]').textContent = dinheiro(dados.wallet.balance);
    const role = dados.current_user.role;
    document.querySelector('[data-account-role]').innerHTML = `<p><span class="role-badge">${texto(({user:'Usuário', moderator:'Moderador', admin:'Administrador'})[role])}</span></p>${role === 'admin' ? '<p><a class="text-link" href="/admin">Painel administrativo →</a></p>' : role === 'moderator' ? '<p><a class="text-link" href="/gerenciar">Gerenciar catálogo →</a></p>' : ''}`;
    document.querySelector('[data-logout]').addEventListener('click', async event => {
      event.currentTarget.disabled = true;
      try { await api.request('/auth/logout', {method:'POST', body:{}}); location.replace('/login'); }
      catch(error) { event.currentTarget.disabled = false; tratarErro(error); }
    });
    try {
      const pedidos = await api.request('/orders');
      document.querySelector('[data-my-orders]').innerHTML = pedidos.length ? `<div class="table-scroll"><table class="management-table"><thead><tr><th>Pedido</th><th>Data</th><th>Pagamento</th><th>Total</th><th></th></tr></thead><tbody>${pedidos.map(p => `<tr><td>#${texto(p.reference)}</td><td>${texto(data(p.created_at))}</td><td>${texto(status(p.payment_status))}</td><td>${dinheiro(p.total)}</td><td><a class="text-link" href="/pedido?id=${texto(p.id)}">Ver pedido →</a></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-inline">Você ainda não tem pedidos. <a class="text-link" href="/produtos">Escolha seus primeiros produtos →</a></p>';
    } catch(error) { tratarErro(error); }
    // Central de documentos: busca/visualizacao de arquivos (contem path traversal intencional no backend).
    const docForm = document.getElementById('documentos-form');
    if (docForm) {
      const docInput = document.querySelector('[data-doc-input]');
      const docList = document.querySelector('[data-doc-list]');
      const docPreview = document.querySelector('[data-doc-preview]');
      const docError = document.querySelector('[data-doc-error]');
      let documentos = [];
      const tamanho = bytes => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
      const renderLista = () => {
        const busca = (docInput.value || '').toLowerCase();
        const visiveis = documentos.filter(d => d.arquivo.toLowerCase().includes(busca));
        docList.innerHTML = visiveis.length
          ? `<div class="table-scroll"><table class="management-table"><thead><tr><th>Arquivo</th><th>Tamanho</th><th></th></tr></thead><tbody>${visiveis.map(d => `<tr><td>${texto(d.arquivo)}</td><td>${texto(tamanho(d.tamanho))}</td><td><a class="text-link" href="#" data-doc-open="${texto(d.arquivo)}">Visualizar →</a></td></tr>`).join('')}</tbody></table></div>`
          : '';
      };
      const abrir = async arquivo => {
        docError.hidden = true;
        if (!arquivo) { docError.textContent = 'Informe o nome do arquivo.'; docError.hidden = false; return; }
        try {
          const doc = await api.request('/documentos/abrir?arquivo=' + encodeURIComponent(arquivo));
          docPreview.textContent = doc.conteudo;
          docPreview.hidden = false;
        } catch(error) {
          docPreview.hidden = true;
          docError.textContent = error.message; docError.hidden = false; docError.focus();
        }
      };
      docInput.addEventListener('input', renderLista);
      docForm.addEventListener('submit', event => { event.preventDefault(); abrir(docInput.value.trim()); });
      docList.addEventListener('click', event => {
        const link = event.target.closest('[data-doc-open]');
        if (!link) return;
        event.preventDefault(); abrir(link.dataset.docOpen);
      });
      try { documentos = await api.request('/documentos'); renderLista(); }
      catch(error) { tratarErro(error); }
    }
  } else {
    const alvo = document.querySelector('[data-order-detail]');
    try {
      const id = params.get('id') || ''; if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Pedido não encontrado.');
      const p = await api.request(`/orders/${id}`);
      alvo.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">Pedido #${texto(p.reference)}</p><h2>Boas escolhas confirmadas<span class="accent">.</span></h2></div><span class="role-badge">${texto(status(p.payment_status))}</span></div><p class="muted">${texto(data(p.created_at))} · ${texto(pagamento(p.payment_method))}</p><div class="table-scroll"><table class="management-table"><thead><tr><th>Produto</th><th>Quantidade</th><th>Subtotal</th></tr></thead><tbody>${p.items.map(i => `<tr><td>${texto(i.name)}<small class="muted">${texto(i.unit)}</small></td><td>${i.quantity}</td><td>${dinheiro(i.subtotal)}</td></tr>`).join('')}</tbody></table></div><div class="order-confirmation-grid"><div><h3>Entrega</h3><p>${texto(p.customer.name)}<br>${texto(p.address.street)}, ${texto(p.address.number)} ${texto(p.address.complement)}<br>${texto(p.address.district)} · ${texto(p.address.city)} / ${texto(p.address.state)}<br>CEP ${texto(p.address.zip)}</p>${p.notes ? `<p class="muted">Observação: ${texto(p.notes)}</p>` : ''}</div><div><div class="summary-line"><span>Subtotal</span><strong>${dinheiro(p.subtotal)}</strong></div><div class="summary-line"><span>Desconto</span><strong>− ${dinheiro(p.discount)}</strong></div><div class="summary-line"><span>Entrega</span><strong>${dinheiro(p.shipping)}</strong></div><div class="summary-line summary-total"><span>Total</span><strong>${dinheiro(p.total)}</strong></div></div></div><a class="button" href="/produtos">Voltar ao mercado →</a>`;
    } catch(error) { alvo.textContent = error.message; }
  }
})();
