# Frontend do Cesar Market

HTML, CSS e JavaScript puro, sem templates Jinja, framework ou etapa de build. A paleta mantém o fundo `#1a1a1a`, cards `#121212` e laranja `#ff7a1a`.

As telas agora dependem da API PHP e do MariaDB. Inicie o Docker Compose na pasta superior e acesse `http://localhost:8081`. Abrir por `file://` ou por um servidor apenas estático não executa contas e compras.

| Arquivo | Responsabilidade |
| --- | --- |
| `html/index.html`, `html/categorias.html`, `html/produtos.html`, `html/hortifruti.html` | Vitrine, departamentos, busca e filtros. |
| `html/produto.html?id=slug` | Detalhes de um produto e inclusão na sacola. |
| `html/carrinho.html`, `html/checkout.html`, `html/pedido.html?id=identificador` | Sacola, entrega, pagamento e confirmação. |
| `html/login.html`, `html/cadastro.html`, `html/conta.html` | Conta, senha, saldo e histórico. |
| `html/admin.html` | Painel exclusivo do administrador. |
| `html/gerenciar.html` | Cadastro de produtos por moderadores e administradores. |
| `html/acesso-negado.html` | Mensagem para uma conta sem a permissão necessária. |
| `css/style.css` | Estilos de todas as páginas e ajustes para celular. |
| `js/api.js` | Requisições HTTP, token CSRF e carregamento inicial da API. |
| `js/script.js` | Componentes compartilhados, catálogo, sacola e checkout. |
| `js/conta.js` | Login, cadastro, senha e pedidos da conta. |
| `js/painel.js` | Formulário de produtos, métricas e checkboxes de moderador. |
| `imagens/` | Fotos, favicon e créditos. |

O antigo `dados.js` foi substituído pela API. Os dados iniciais foram preservados em `../infra/database/catalogo.json`; as mudanças posteriores são gravadas no banco.

A página **Todos os produtos** busca a listagem paginada na rota `/api/products?page=1&limit=10`; os parâmetros `page` e `limit` da URL da página são repassados à API. Os demais componentes utilizam os produtos visíveis retornados pelo bootstrap da API. Nomes longos quebram linha nos cards.

O checkout já abre com contato e endereço fictícios preenchidos. Os campos são editáveis e opcionais, sem validação de formato ou existência de CPF, telefone, e-mail, CEP, cidade ou estado. Permanecem apenas os limites de tamanho e tipo de texto. Novas contas recebem R$ 50,00 de crédito virtual por padrão; contas existentes mantêm o saldo atual.

O checkout envia os IDs dos produtos. O servidor valida os preços contra o catálogo e calcula os totais.

O servidor valida as permissões das páginas de gestão e de todas as operações da API. Somente a carteira movimenta saldo virtual e pode concluir compras. Pix e cartão permanecem visíveis, acinzentados e desabilitados, com uma faixa diagonal de manutenção; a API também rejeita esses meios de pagamento. Consulte o `../README.md` para configurar e operar os containers.

## Rotas no navegador

Os nomes dos arquivos acima são internos. Na navegação, use `/`, `/categorias`, `/produtos`, `/hortifruti`, `/produto?id=slug`, `/carrinho`, `/checkout`, `/pedido?id=identificador`, `/login`, `/cadastro`, `/conta`, `/admin` e `/gerenciar`. O Nginx resolve esses caminhos e redireciona as URLs antigas com `.html`.

## Estrutura de pastas

```text
frontend/
  html/       páginas HTML
  js/         scripts da interface e acesso à API
  css/        estilos compartilhados
  imagens/    fotos, favicon e créditos
  README.md
```

Os HTMLs carregam `/css/style.css` e os scripts em `/js/`. Imagens usam `/imagens/` e requisições ao backend continuam em `/api/`. O Nginx usa `html/` como raiz das páginas e mantém as URLs públicas como `/conta` e `/admin`. A pasta física `/html/` não é exposta pelo servidor; as páginas administrativas continuam protegidas. Os caminhos antigos dos scripts e do CSS redirecionam para as novas pastas.
