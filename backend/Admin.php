<?php
declare(strict_types=1);

namespace Market;

final class Admin
{
    public static function stats(): array
    {
        Auth::requireUser(['admin']);
        $counts = Database::query("SELECT COUNT(*) AS users,SUM(role='moderator') AS moderators,COALESCE(SUM(wallet_cents),0) AS wallet_total FROM users")->fetch();
        $orders = Database::query('SELECT COUNT(*) AS orders,COALESCE(SUM(total_cents),0) AS total FROM orders')->fetch();
        $recent = Database::query('SELECT o.public_id,o.total_cents,o.payment_method,o.payment_status,o.created_at,u.name AS customer FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 5')->fetchAll();
        return [
            'users' => (int)$counts['users'], 'moderators' => (int)$counts['moderators'],
            'products' => (int)Database::query('SELECT COUNT(*) FROM products WHERE active=1')->fetchColumn(),
            'orders' => (int)$orders['orders'], 'order_total' => Database::money((int)$orders['total']),
            'wallet_total' => Database::money((int)$counts['wallet_total']),
            'recent_orders' => array_map(static fn(array $row): array => ['reference' => strtoupper(substr($row['public_id'], 0, 8)), 'customer' => $row['customer'], 'total' => Database::money((int)$row['total_cents']), 'payment_method' => $row['payment_method'], 'payment_status' => $row['payment_status'], 'created_at' => $row['created_at']], $recent),
        ];
    }

    public static function users(): array
    {
        Auth::requireUser(['admin']);
        return array_map(static fn(array $row): array => ['id' => (int)$row['id'], 'name' => $row['name'], 'login' => $row['login'], 'role' => $row['role'], 'created_at' => $row['created_at']], Database::query('SELECT id,name,login,role,created_at FROM users ORDER BY id DESC')->fetchAll());
    }

    public static function moderator(int $targetId, array $input): array
    {
        $actor = Auth::requireUser(['admin']);
        Http::allowed($input, ['enabled']);
        if (!isset($input['enabled']) || !is_bool($input['enabled'])) throw new ApiError(422, 'Informe se a permissão de moderador está habilitada.');
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $target = Database::query('SELECT id,role FROM users WHERE id=? FOR UPDATE', [$targetId])->fetch();
            if (!$target) throw new ApiError(404, 'Conta não encontrada.');
            if ($target['role'] === 'admin') throw new ApiError(409, 'A conta de administrador não pode ser alterada por esse controle.');
            $role = $input['enabled'] ? 'moderator' : 'user';
            if ($target['role'] !== $role) {
                Database::query('UPDATE users SET role=? WHERE id=?', [$role, $targetId]);
                Database::query('INSERT INTO role_changes (actor_id,target_id,old_role,new_role) VALUES (?,?,?,?)', [$actor['id'], $targetId, $target['role'], $role]);
            }
            $pdo->commit();
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        return ['id' => $targetId, 'role' => $role];
    }

    public static function createProduct(array $input): array
    {
        $user = Auth::requireUser(['moderator', 'admin']);
        Http::allowed($input, ['name', 'category_id', 'unit', 'price', 'old_price', 'stock', 'tag', 'description', 'storage', 'image_name']);
        $name = Http::string($input, 'name', 2, 140, 'nome do produto');
        $unit = Http::string($input, 'unit', 2, 100, 'unidade');
        $description = Http::string($input, 'description', 10, 4000, 'descrição');
        $storage = Http::string($input, 'storage', 0, 2000, 'conservação');
        $tag = Http::string($input, 'tag', 0, 40, 'selo');
        $categoryId = filter_var($input['category_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if (!$categoryId || !Database::query('SELECT id FROM categories WHERE id=?', [$categoryId])->fetchColumn()) throw new ApiError(422, 'Escolha uma categoria válida.');
        $price = Http::price($input['price'] ?? null);
        $old = Http::price($input['old_price'] ?? '', true);
        if ($old !== null && $old <= $price) throw new ApiError(422, 'O preço anterior deve ser maior que o preço atual.');
        $stock = filter_var($input['stock'] ?? 100, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 100000]]);
        if ($stock === false) throw new ApiError(422, 'Informe um estoque inteiro entre 0 e 100.000.');
        $image = $input['image_name'] ?? 'basket.jpg';
        $available = array_values(array_unique(array_merge(['basket.jpg', 'market.jpg'], array_column(Database::seedData()['products'], 'image'))));
        if (!is_string($image) || !in_array($image, $available, true)) throw new ApiError(422, 'Escolha uma imagem do catálogo ou envie um arquivo.');
        $uploadedPath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $file = $_FILES['image'];
            if (is_array($file['error']) || $file['error'] !== UPLOAD_ERR_OK || (int)$file['size'] > 4 * 1024 * 1024) throw new ApiError(422, 'Envie uma imagem de até 4 MB.');
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            $size = @getimagesize($file['tmp_name']);
            if (!isset($extensions[$mime]) || !$size || $size[0] > 6000 || $size[1] > 6000) throw new ApiError(422, 'Use uma imagem JPG, PNG ou WebP com até 6000 pixels por lado.');
            $filename = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
            $directory = getenv('UPLOAD_DIRECTORY') ?: '/var/www/uploads';
            $uploadedPath = rtrim($directory, '/') . '/' . $filename;
            if (!move_uploaded_file($file['tmp_name'], $uploadedPath)) throw new ApiError(500, 'Não foi possível salvar a imagem.');
            $image = '/uploads/' . $filename;
        }
        $base = strtolower((string)iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name));
        $base = trim((string)preg_replace('/[^a-z0-9]+/', '-', $base), '-');
        $slug = substr($base ?: 'produto', 0, 105) . '-' . bin2hex(random_bytes(3));
        $sku = 'CM-' . strtoupper(bin2hex(random_bytes(4)));
        try {
            Database::query('INSERT INTO products (category_id,created_by,slug,name,unit,price_cents,old_price_cents,stock,image,tag,sku,description,storage) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [$categoryId, $user['id'], $slug, $name, $unit, $price, $old, $stock, $image, $tag, $sku, $description, $storage]);
            $id = (int)Database::connection()->lastInsertId();
        } catch (\Throwable $error) {
            if ($uploadedPath !== null) @unlink($uploadedPath);
            throw $error;
        }
        $row = Database::query('SELECT p.*,c.name AS category_name,c.slug AS category_slug FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?', [$id])->fetch();
        return Store::product($row);
    }
}
