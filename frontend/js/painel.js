/* Gestão de catálogo e moderadores. A autorização é refeita pela API a cada ação. */
(async () => {
  'use strict';
  const app = await window.MercadoPronto; if (!app) return;
  const {dados, api, texto, dinheiro, toast, tratarErro} = app;
  const admin = document.body.dataset.pagina === 'admin';
  if (!dados.current_user || !['admin', 'moderator'].includes(dados.current_user.role) || (admin && dados.current_user.role !== 'admin')) { location.replace('/acesso-negado'); return; }
  const form = document.getElementById('produto-form');
  form.elements.category_id.insertAdjacentHTML('beforeend', dados.categories.map(c => `<option value="${c.id}">${texto(c.name)}</option>`).join(''));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const botao = form.querySelector('[type=submit]');
    const erro = form.querySelector('.form-error'); const sucesso = form.querySelector('.form-success');
    erro.hidden = true; sucesso.hidden = true; botao.disabled = true;
    try {
      const body = new FormData(form);
      if (!form.elements.image.files.length) body.delete('image');
      const produto = await api.request('/products', {method:'POST', body});
      form.reset(); sucesso.innerHTML = `Produto publicado. <a class="text-link" href="/produto?id=${texto(produto.slug)}">Ver no catálogo ↗</a>`; sucesso.hidden = false;
      toast('Novo produto publicado no catálogo.');
      if (admin) await carregarMetricas();
    } catch(error) { tratarErro(error, erro); }
    finally { botao.disabled = false; }
  });
  async function carregarMetricas() {
    const stats = await api.request('/admin/stats');
    const metricas = [['Contas cadastradas',stats.users,'user'],['Produtos no catálogo',stats.products,'basket'],['Pedidos registrados',stats.orders,'bag'],['Total dos pedidos',dinheiro(stats.order_total),'wallet']];
    document.querySelector('[data-metrics]').innerHTML = metricas.map(([label,value,icon]) => `<article class="metric-card"><div class="metric-icon">${app.icone(icon)}</div><span>${texto(label)}</span><strong>${texto(value)}</strong></article>`).join('');
    document.querySelector('[data-recent-orders]').innerHTML = stats.recent_orders.length ? stats.recent_orders.map(p => `<div class="recent-order"><div><strong>#${texto(p.reference)}</strong><small>${texto(p.customer)}</small></div><div><strong>${dinheiro(p.total)}</strong><small>${p.payment_status === 'paid' ? 'Carteira virtual' : 'Simulado'}</small></div></div>`).join('') : '<p class="empty-inline">Os próximos pedidos aparecerão aqui.</p>';
  }
  if (!admin) return;
  let usuarios = [];
  function listarUsuarios() {
    const busca = document.querySelector('[data-user-search]').value.trim().toLocaleLowerCase('pt-BR');
    const lista = usuarios.filter(u => `${u.name} ${u.login}`.toLocaleLowerCase('pt-BR').includes(busca));
    document.querySelector('[data-users]').innerHTML = `<table class="management-table"><thead><tr><th>Conta</th><th>Perfil</th><th>Moderador</th></tr></thead><tbody>${lista.map(u => `<tr><td><strong>${texto(u.name)}</strong><small>${texto(u.login)}</small></td><td><span class="role-badge">${texto(({user:'Usuário',moderator:'Moderador',admin:'Admin'})[u.role])}</span></td><td><label class="moderator-toggle"><input type="checkbox" data-moderator="${u.id}" ${u.role === 'moderator' ? 'checked' : ''} ${u.role === 'admin' ? 'disabled' : ''} aria-label="Permitir que ${texto(u.name)} seja moderador"><span class="sr-only">Moderador</span></label></td></tr>`).join('') || '<tr><td colspan="3">Nenhuma conta encontrada.</td></tr>'}</tbody></table>`;
  }
  document.querySelector('[data-user-search]').addEventListener('input', listarUsuarios);
  document.querySelector('[data-users]').addEventListener('change', async event => {
    const checkbox = event.target.closest('[data-moderator]'); if (!checkbox) return;
    const anterior = !checkbox.checked; checkbox.disabled = true;
    const erro = document.querySelector('[data-role-error]'); erro.hidden = true;
    try {
      const resposta = await api.request(`/admin/users/${checkbox.dataset.moderator}/moderator`, {method:'PATCH', body:{enabled:checkbox.checked}});
      usuarios.find(u => u.id === resposta.id).role = resposta.role;
      listarUsuarios(); toast(resposta.role === 'moderator' ? 'Permissão de moderador concedida.' : 'Conta alterada para usuário comum.');
    } catch(error) { checkbox.checked = anterior; checkbox.disabled = false; tratarErro(error, erro); }
  });
  try { await carregarMetricas(); usuarios = await api.request('/admin/users'); listarUsuarios(); }
  catch(error) { tratarErro(error); }
})();
