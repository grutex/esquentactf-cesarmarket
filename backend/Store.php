<?php
declare(strict_types=1);

namespace Market;

final class Store
{
    public static function categories(): array
    {
        return array_map(static fn(array $row): array => [
            'id' => (int)$row['id'], 'slug' => $row['slug'], 'name' => $row['name'],
            'description' => $row['description'], 'image' => $row['image'],
        ], Database::query('SELECT * FROM categories ORDER BY sort_order,id')->fetchAll());
    }

    public static function products(): array
    {
        return array_map([self::class, 'product'], Database::query('SELECT p.*,c.name AS category_name,c.slug AS category_slug FROM products p JOIN categories c ON c.id=p.category_id WHERE p.active=1 AND p.catalog_visible=1 ORDER BY p.featured DESC,p.id')->fetchAll());
    }

    public static function listedProducts(array $query): array
    {
        Http::allowed($query, ['page', 'limit']);
        if (!$query) return self::products();
        $page = filter_var($query['page'] ?? '1', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000000]]);
        $limit = filter_var($query['limit'] ?? '10', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 100]]);
        if ($page === false || $limit === false) {
            throw new ApiError(422, 'Informe uma página válida e um limite entre 1 e 100.');
        }
        return array_map([self::class, 'product'], Database::query('SELECT p.*,c.name AS category_name,c.slug AS category_slug FROM products p JOIN categories c ON c.id=p.category_id WHERE p.active=1 ORDER BY p.id LIMIT ? OFFSET ?', [$limit, ($page - 1) * $limit])->fetchAll());
    }

    public static function productById(int $id): array
    {
        $row = Database::query('SELECT p.*,c.name AS category_name,c.slug AS category_slug FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=? AND p.active=1', [$id])->fetch();
        if (!$row) throw new ApiError(404, 'Produto não encontrado.');
        return self::product($row);
    }

    public static function product(array $row): array
    {
        return [
            'id' => (int)$row['id'], 'slug' => $row['slug'], 'name' => $row['name'],
            'image' => $row['image'], 'category' => $row['category_name'], 'category_slug' => $row['category_slug'],
            'category_id' => (int)$row['category_id'], 'unit' => $row['unit'],
            'price' => Database::money((int)$row['price_cents']),
            'old' => $row['old_price_cents'] !== null ? Database::money((int)$row['old_price_cents']) : '',
            'stock' => (int)$row['stock'], 'tag' => $row['tag'], 'sku' => $row['sku'],
            'description' => $row['description'], 'storage' => $row['storage'],
            'thumbnail_alt' => 'Miniatura de ' . $row['name'], 'featured' => (bool)$row['featured'],
        ];
    }

    private const DOCS_DIR = '/var/www/documentos';

    private static function docsDir(): string
    {
        return getenv('DOCUMENTS_DIRECTORY') ?: self::DOCS_DIR;
    }

    // Lista os documentos reais da pasta (apenas para a UI parecer legitima e navegavel).
    public static function documents(): array
    {
        Auth::requireUser();
        $base = self::docsDir();
        $arquivos = is_dir($base) ? array_values(array_filter(scandir($base) ?: [], static fn(string $f): bool => is_file($base . '/' . $f))) : [];
        return array_map(static fn(string $f): array => [
            'arquivo' => $f,
            'tamanho' => (int)@filesize($base . '/' . $f),
        ], $arquivos);
    }

    public static function openDocument(array $query): array
    {
        Auth::requireUser();
        Http::allowed($query, ['arquivo']);
        $arquivo = (string)($query['arquivo'] ?? '');
        if ($arquivo === '') throw new ApiError(422, 'Informe o nome do arquivo.');

        $base = self::docsDir();
        $root = realpath($base);
        $path = realpath($base . DIRECTORY_SEPARATOR . $arquivo);
        if ($root === false || $path === false || dirname($path) !== $root || !is_file($path)) {
            throw new ApiError(404, 'Documento não encontrado.');
        }

        $conteudo = @file_get_contents($path);
        if ($conteudo === false) throw new ApiError(404, 'Documento não encontrado.');
        return ['arquivo' => $arquivo, 'conteudo' => $conteudo];
    }

    public static function cart(?int $userId, array $prices = []): array
    {
        $lines = [];
        $subtotal = 0;
        $count = 0;
        if ($userId !== null) {
            $rows = Database::query('SELECT ci.quantity,p.id,p.slug,p.name,p.image,p.unit,p.price_cents,p.stock FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.user_id=? AND p.active=1 ORDER BY p.id', [$userId])->fetchAll();
            foreach ($rows as $row) {
                $quantity = (int)$row['quantity'];
                $row['price_cents'] = $prices[(int)$row['id']] ?? (int)$row['price_cents'];
                $lineSubtotal = $quantity * (int)$row['price_cents'];
                $lines[] = [
                    'product_id' => (int)$row['id'], 'product_slug' => $row['slug'], 'quantity' => $quantity,
                    'subtotal' => Database::money($lineSubtotal), 'subtotal_cents' => $lineSubtotal,
                    'name' => $row['name'], 'image' => $row['image'], 'unit' => $row['unit'],
                    'price' => Database::money((int)$row['price_cents']), 'stock' => (int)$row['stock'],
                ];
                $subtotal += $lineSubtotal;
                $count += $quantity;
            }
        }
        $coupon = $userId ? Database::query('SELECT co.code,co.percent_off FROM carts ca JOIN coupons co ON co.id=ca.coupon_id WHERE ca.user_id=? AND co.active=1', [$userId])->fetch() : false;
        $discount = $coupon ? intdiv(abs($subtotal) * min(100, (int)$coupon['percent_off']) + 50, 100) * ($subtotal < 0 ? -1 : 1) : 0;
        $delivery = $lines ? max(0, (int)(getenv('DELIVERY_FEE_CENTS') !== false ? getenv('DELIVERY_FEE_CENTS') : 790)) : 0;
        return [
            'lines' => $lines, 'count' => $count,
            'subtotal' => Database::money($subtotal), 'subtotal_cents' => $subtotal,
            'discount' => Database::money($discount), 'discount_cents' => $discount,
            'delivery_fee' => Database::money($delivery), 'delivery_cents' => $delivery,
            'total' => Database::money($subtotal - $discount + $delivery), 'total_cents' => $subtotal - $discount + $delivery,
            'coupon' => $coupon ? $coupon['code'] : null,
        ];
    }

    public static function bootstrap(): array
    {
        $seed = Database::seedData();
        $user = Auth::user();
        $products = self::products();
        $featured = array_values(array_column(array_filter($products, static fn(array $p): bool => $p['featured']), 'slug'));
        $ctfdBaseUrl = rtrim(trim(getenv('CTFD_BASE_URL') ?: 'http://localhost'), '/');
        $ctfdParts = parse_url($ctfdBaseUrl);
        if (!filter_var($ctfdBaseUrl, FILTER_VALIDATE_URL) || !in_array(strtolower($ctfdParts['scheme'] ?? ''), ['http', 'https'], true) || isset($ctfdParts['query']) || isset($ctfdParts['fragment']) || isset($ctfdParts['user']) || isset($ctfdParts['pass'])) {
            $ctfdBaseUrl = 'http://localhost';
        }
        return [
            'site' => $seed['site'],
            'links' => ['ctfd_tutorials' => $ctfdBaseUrl . '/tutorials'],
            'user' => [
                'greeting' => $user ? 'Olá, ' . explode(' ', $user['name'])[0] : 'Olá, visitante',
                'account_label' => $user ? 'Minha conta' : 'Entrar / cadastrar',
            ],
            'current_user' => Auth::publicUser($user),
            'delivery' => $seed['delivery'],
            'wallet' => ['name' => 'Carteira Cesar', 'balance' => Database::money((int)($user['wallet_cents'] ?? 0))],
            'categories' => self::categories(), 'products' => $products,
            'cart' => self::cart($user ? (int)$user['id'] : null),
            'featured_product_slugs' => $featured ?: array_slice(array_column($products, 'slug'), 0, 4),
            'cart_recommendation_slugs' => array_slice(array_column($products, 'slug'), 3, 4),
            'checkout' => $seed['checkout'], 'csrf' => $_SESSION['csrf'], 'checkout_token' => $_SESSION['checkout_token'],
        ];
    }

    public static function addToCart(array $input): array
    {
        $user = Auth::requireUser();
        Http::allowed($input, ['product_slug', 'quantity']);
        $slug = Http::string($input, 'product_slug', 1, 120, 'produto');
        $quantity = Http::quantity($input['quantity'] ?? 1);
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            Database::query('SELECT id FROM users WHERE id=? FOR UPDATE', [$user['id']]);
            $product = Database::query('SELECT id,stock FROM products WHERE slug=? AND active=1 FOR UPDATE', [$slug])->fetch();
            if (!$product) throw new ApiError(404, 'Produto não encontrado.');
            $current = (int)Database::query('SELECT quantity FROM cart_items WHERE user_id=? AND product_id=?', [$user['id'], $product['id']])->fetchColumn();
            $total = $current + $quantity;
            if ($total > 100 || $total > (int)$product['stock']) throw new ApiError(422, 'A quantidade ultrapassa o estoque disponível.');
            Database::query('INSERT INTO cart_items (user_id,product_id,quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity=?', [$user['id'], $product['id'], $total, $total]);
            $pdo->commit();
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        return self::cart((int)$user['id']);
    }

    public static function updateCart(string $slug, ?array $input): array
    {
        $user = Auth::requireUser();
        $quantity = null;
        if ($input !== null) {
            Http::allowed($input, ['quantity']);
            $quantity = Http::quantity($input['quantity'] ?? null);
        }
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            Database::query('SELECT id FROM users WHERE id=? FOR UPDATE', [$user['id']]);
            $product = Database::query('SELECT id,stock FROM products WHERE slug=? AND active=1 FOR UPDATE', [$slug])->fetch();
            if (!$product) throw new ApiError(404, 'Produto não encontrado.');
            if ($quantity !== null) {
                if ($quantity > (int)$product['stock']) throw new ApiError(422, 'Estoque insuficiente para essa quantidade.');
                Database::query('UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?', [$quantity, $user['id'], $product['id']]);
            } else {
                Database::query('DELETE FROM cart_items WHERE user_id=? AND product_id=?', [$user['id'], $product['id']]);
            }
            $pdo->commit();
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        return self::cart((int)$user['id']);
    }

    public static function coupon(array $input): array
    {
        $user = Auth::requireUser();
        Http::allowed($input, ['code']);
        $code = strtoupper(Http::string($input, 'code', 1, 40, 'cupom'));
        $coupon = Database::query('SELECT id FROM coupons WHERE code=? AND active=1', [$code])->fetchColumn();
        if (!$coupon) throw new ApiError(422, 'Cupom não encontrado ou indisponível.');
        Database::query('UPDATE carts SET coupon_id=? WHERE user_id=?', [$coupon, $user['id']]);
        return self::cart((int)$user['id']);
    }

    public static function checkout(array $input): array
    {
        $user = Auth::requireUser();
        Http::allowed($input, ['request_key', 'payment_method', 'delivery_method', 'customer', 'address', 'notes', 'items']);
        $requestKey = Http::string($input, 'request_key', 24, 64, 'identificador do pedido');
        if (!preg_match('/^[a-f0-9]+$/D', $requestKey)) throw new ApiError(422, 'Identificador do pedido inválido.');
        $existing = Database::query('SELECT public_id FROM orders WHERE user_id=? AND request_key=?', [$user['id'], $requestKey])->fetchColumn();
        if ($existing) return self::order((string)$existing, (int)$user['id']);
        if (!hash_equals($_SESSION['checkout_token'], $requestKey)) throw new ApiError(409, 'Atualize o checkout antes de enviar outro pedido.');
        $method = $input['payment_method'] ?? '';
        $delivery = $input['delivery_method'] ?? '';
        // A manutenção de Pix e cartão também é aplicada na API, sem permitir contornar a interface.
        if ($method !== 'carteira') throw new ApiError(422, 'Pix e cartão estão em manutenção. Utilize a Carteira Cesar.');
        if (!in_array($delivery, ['padrao', 'agendada'], true)) throw new ApiError(422, 'Escolha uma entrega válida.');
        $itemsInput = $input['items'] ?? [];
        if (!is_array($itemsInput) || !array_is_list($itemsInput)) throw new ApiError(422, 'Envie os itens como uma lista.');
        $prices = [];
        foreach ($itemsInput as $item) {
            if (!is_array($item)) throw new ApiError(422, 'Informe um item válido.');
            Http::allowed($item, ['product_id']);
            $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if (!$productId || array_key_exists($productId, $prices)) throw new ApiError(422, 'Informe IDs de produtos válidos, sem repetições.');
            $price = Database::query('SELECT price_cents FROM products WHERE id=? AND active=1', [$productId])->fetchColumn();
            if ($price === false) throw new ApiError(422, 'Produto não encontrado.');
            $prices[$productId] = (int)$price;
        }
        $customerInput = $input['customer'] ?? [];
        $addressInput = $input['address'] ?? [];
        if (!is_array($customerInput) || !is_array($addressInput)) throw new ApiError(422, 'Envie os dados de contato e endereço como objetos.');
        Http::allowed($customerInput, ['name', 'email', 'phone', 'document']);
        Http::allowed($addressInput, ['zip', 'city', 'street', 'number', 'complement', 'district', 'state']);
        // Contato e localização são fictícios no CTF: apenas tipo e tamanho são verificados.
        $customer = [
            'name' => Http::string($customerInput, 'name', 0, 100, 'nome'),
            'email' => Http::string($customerInput, 'email', 0, 190, 'e-mail'),
            'phone' => Http::string($customerInput, 'phone', 0, 30, 'celular'),
            'document' => Http::string($customerInput, 'document', 0, 20, 'CPF'),
        ];
        $address = [];
        foreach (['zip' => 40, 'city' => 100, 'street' => 140, 'number' => 20, 'complement' => 100, 'district' => 100, 'state' => 40] as $field => $maximum) {
            $address[$field] = Http::string($addressInput, $field, 0, $maximum, 'endereço');
        }
        $notes = Http::string($input, 'notes', 0, 1000, 'observações');
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $lockedUser = Database::query('SELECT wallet_cents FROM users WHERE id=? FOR UPDATE', [$user['id']])->fetch();
            $existing = Database::query('SELECT public_id FROM orders WHERE user_id=? AND request_key=?', [$user['id'], $requestKey])->fetchColumn();
            if ($existing) {
                $pdo->commit();
                return self::order((string)$existing, (int)$user['id']);
            }
            $cart = self::cart((int)$user['id'], $prices);
            if (!$cart['lines']) throw new ApiError(422, 'Sua sacola está vazia.');
            if (array_diff(array_keys($prices), array_column($cart['lines'], 'product_id'))) throw new ApiError(422, 'Um produto informado não está na sua sacola.');
            foreach ($cart['lines'] as $line) {
                $product = Database::query('SELECT price_cents,stock FROM products WHERE id=? AND active=1 FOR UPDATE', [$line['product_id']])->fetch();
                if (!$product || (int)$product['stock'] < $line['quantity']) throw new ApiError(409, 'Um item ficou sem estoque. Revise sua sacola.');
            }
            if ((int)$lockedUser['wallet_cents'] < $cart['total_cents']) throw new ApiError(422, 'O saldo da carteira é insuficiente para este pedido.');
            $publicId = bin2hex(random_bytes(16));
            Database::query('INSERT INTO orders (user_id,public_id,request_key,subtotal_cents,discount_cents,shipping_cents,total_cents,payment_method,payment_status,delivery_method,customer,address,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [
                $user['id'], $publicId, $requestKey, $cart['subtotal_cents'], $cart['discount_cents'], $cart['delivery_cents'], $cart['total_cents'], $method,
                'paid', $delivery, json_encode($customer, JSON_THROW_ON_ERROR), json_encode($address, JSON_THROW_ON_ERROR), $notes,
            ]);
            $orderId = (int)$pdo->lastInsertId();
            foreach ($cart['lines'] as $line) {
                Database::query('INSERT INTO order_items (order_id,product_id,product_name,unit,unit_price_cents,quantity,subtotal_cents) VALUES (?,?,?,?,?,?,?)', [$orderId, $line['product_id'], $line['name'], $line['unit'], intdiv($line['subtotal_cents'], $line['quantity']), $line['quantity'], $line['subtotal_cents']]);
                Database::query('UPDATE products SET stock=stock-? WHERE id=?', [$line['quantity'], $line['product_id']]);
            }
            Database::query('UPDATE users SET wallet_cents=CAST(wallet_cents AS SIGNED)-? WHERE id=?', [$cart['total_cents'], $user['id']]);
            Database::query('INSERT INTO wallet_entries (user_id,order_id,amount_cents,description) VALUES (?,?,?,?)', [$user['id'], $orderId, -$cart['total_cents'], 'Pagamento do pedido ' . substr($publicId, 0, 8)]);
            Database::query('DELETE FROM cart_items WHERE user_id=?', [$user['id']]);
            Database::query('UPDATE carts SET coupon_id=NULL WHERE user_id=?', [$user['id']]);
            $pdo->commit();
            $_SESSION['checkout_token'] = bin2hex(random_bytes(24));
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        return self::order($publicId, (int)$user['id']);
    }

    public static function order(string $publicId, int $userId): array
    {
        $order = Database::query('SELECT * FROM orders WHERE public_id=? AND user_id=?', [$publicId, $userId])->fetch();
        if (!$order) throw new ApiError(404, 'Pedido não encontrado.');
        $items = Database::query('SELECT product_name,unit,unit_price_cents,quantity,subtotal_cents FROM order_items WHERE order_id=? ORDER BY id', [$order['id']])->fetchAll();
        return [
            'id' => $order['public_id'], 'reference' => strtoupper(substr($order['public_id'], 0, 8)),
            'subtotal' => Database::money((int)$order['subtotal_cents']), 'discount' => Database::money((int)$order['discount_cents']),
            'shipping' => Database::money((int)$order['shipping_cents']), 'total' => Database::money((int)$order['total_cents']),
            'payment_method' => $order['payment_method'], 'payment_status' => $order['payment_status'],
            'delivery_method' => $order['delivery_method'], 'created_at' => $order['created_at'],
            'customer' => json_decode($order['customer'], true, 32, JSON_THROW_ON_ERROR),
            'address' => json_decode($order['address'], true, 32, JSON_THROW_ON_ERROR), 'notes' => $order['notes'],
            'items' => array_map(static fn(array $item): array => ['name' => $item['product_name'], 'unit' => $item['unit'], 'quantity' => (int)$item['quantity'], 'price' => Database::money((int)$item['unit_price_cents']), 'subtotal' => Database::money((int)$item['subtotal_cents'])], $items),
        ];
    }

    public static function orders(): array
    {
        $user = Auth::requireUser();
        return array_map(static fn(array $row): array => ['id' => $row['public_id'], 'reference' => strtoupper(substr($row['public_id'], 0, 8)), 'total' => Database::money((int)$row['total_cents']), 'payment_method' => $row['payment_method'], 'payment_status' => $row['payment_status'], 'created_at' => $row['created_at']], Database::query('SELECT public_id,total_cents,payment_method,payment_status,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100', [$user['id']])->fetchAll());
    }
}
