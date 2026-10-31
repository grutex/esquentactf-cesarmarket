<?php
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

use Market\Database;
use Market\Http;

$pdo = Database::connection();
$schema = (string)file_get_contents(dirname(__DIR__, 2) . '/infra/database/schema.sql');
foreach (preg_split('/;\s*(?:\r?\n|$)/', $schema) as $statement) {
    if (trim($statement) !== '') $pdo->exec($statement);
}
if (Database::query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='email'")->fetchColumn()) {
    $pdo->exec((string)file_get_contents(dirname(__DIR__, 2) . '/infra/database/migrations/001_email_to_login.sql'));
    echo "Identificador de acesso migrado para login; contas preservadas.\n";
}
Database::query("INSERT IGNORE INTO app_settings (setting_key,setting_value) VALUES ('initialization','pending')");
$pdo->exec((string)file_get_contents(dirname(__DIR__, 2) . '/infra/database/migrations/002_catalog_visibility.sql'));
$pdo->exec((string)file_get_contents(dirname(__DIR__, 2) . '/infra/database/migrations/003_checkout_prices.sql'));
$pdo->beginTransaction();
try {
    $state = Database::query("SELECT setting_value FROM app_settings WHERE setting_key='initialization' FOR UPDATE")->fetchColumn();
    if ($state !== 'complete') {
        $login = Http::login(['login' => getenv('ADMIN_LOGIN') ?: (getenv('ADMIN_EMAIL') ?: 'administrador')]);
        $password = getenv('ADMIN_PASSWORD') ?: '';
        if (strlen($password) < 12 || strlen($password) > 72) {
            throw new RuntimeException('Configure ADMIN_LOGIN e uma ADMIN_PASSWORD aleatória de 12 a 72 caracteres no .env.');
        }
        if (Database::query('SELECT id FROM users WHERE login=?', [$login])->fetchColumn()) {
            throw new RuntimeException('O login de bootstrap já pertence a uma conta. A inicialização não promoverá contas existentes.');
        }
        // O administrador também recebe os R$ 50,00 padrão apenas na criação.
        $credit = max(0, min(100000000, (int)(getenv('WELCOME_CREDIT_CENTS') !== false ? getenv('WELCOME_CREDIT_CENTS') : 5000)));
        Database::query("INSERT INTO users (name,login,password_hash,role,wallet_cents) VALUES (?,?,?,'admin',?)", [getenv('ADMIN_NAME') ?: 'Administrador Cesar', $login, password_hash($password, PASSWORD_DEFAULT), $credit]);
        $adminId = (int)$pdo->lastInsertId();
        Database::query('INSERT INTO carts (user_id) VALUES (?)', [$adminId]);
        if ($credit) Database::query('INSERT INTO wallet_entries (user_id,amount_cents,description) VALUES (?,?,?)', [$adminId, $credit, 'Saldo virtual inicial']);
        $data = Database::seedData();
        foreach ($data['categories'] as $index => $category) {
            Database::query('INSERT INTO categories (slug,name,description,image,sort_order) VALUES (?,?,?,?,?)', [$category['slug'], $category['name'], $category['description'], $category['image'], $index]);
        }
        foreach ($data['products'] as $index => $product) {
            $categoryId = Database::query('SELECT id FROM categories WHERE slug=?', [$product['category_slug']])->fetchColumn();
            Database::query('INSERT INTO products (category_id,created_by,slug,name,unit,price_cents,old_price_cents,stock,image,tag,sku,description,storage,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
                $categoryId, $adminId, $product['slug'], $product['name'], $product['unit'],
                (int)round((float)$product['price'] * 100), $product['old'] !== '' ? (int)round((float)$product['old'] * 100) : null,
                100, $product['image'], $product['tag'], $product['sku'], $product['description'], $product['storage'], $index < 4 ? 1 : 0,
            ]);
        }
        Database::query("INSERT INTO coupons (code,percent_off) VALUES ('BEMVINDO10',10)");
        Database::query("UPDATE app_settings SET setting_value='complete' WHERE setting_key='initialization'");
        echo "Banco inicializado e administrador criado: {$login}\n";
    } else {
        echo "Banco pronto; dados e credenciais existentes preservados.\n";
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
