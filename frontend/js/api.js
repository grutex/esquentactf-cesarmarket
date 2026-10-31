/* Transporte HTTP compartilhado. Sessão e permissões são verificadas pelo PHP. */
(() => {
  'use strict';
  let csrf = '';
  let inicializacao;
  class ApiError extends Error {
    constructor(message, status, fields = {}) { super(message); this.status = status; this.fields = fields; }
  }
  async function request(path, { method = 'GET', body, signal } = {}) {
    const headers = { Accept: 'application/json' };
    const multipart = body instanceof FormData;
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = csrf;
    let response;
    try {
      response = await fetch(`/api${path}`, { method, headers, credentials: 'same-origin', cache: 'no-store', signal, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body) });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError('Não foi possível conectar ao mercado. Tente novamente.', 0);
    }
    let payload;
    try { payload = await response.json(); } catch { throw new ApiError('O servidor não respondeu como esperado. Tente novamente.', response.status); }
    if (!response.ok || !payload.ok) throw new ApiError(payload.message || 'Não foi possível concluir esta ação.', response.status, payload.errors);
    if (payload.data?.csrf) csrf = payload.data.csrf;
    return payload.data;
  }
  const bootstrap = (refresh = false) => {
    if (refresh || !inicializacao) inicializacao = request('/bootstrap');
    return inicializacao;
  };
  window.MarketAPI = { request, bootstrap, ApiError };
})();
