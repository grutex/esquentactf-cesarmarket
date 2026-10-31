<?php
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

use Market\Admin;
use Market\ApiError;
use Market\Auth;
use Market\Database;
use Market\Http;
use Market\Store;

try {
    $path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($path === '/api/health' && $method === 'GET') {
        Database::query('SELECT 1');
        Http::json(['status' => 'ready']);
    }
    Auth::start();
    if ($path === '/api/authorize/admin' || $path === '/api/authorize/editor') {
        Auth::requireUser($path === '/api/authorize/admin' ? ['admin'] : ['admin', 'moderator']);
        session_write_close();
        http_response_code(204);
        exit;
    }
    if (!in_array($method, ['GET', 'HEAD'], true)) Auth::csrf();
    if ($path === '/api/bootstrap' && $method === 'GET') Http::json(Store::bootstrap());
    if ($path === '/api/auth/register' && $method === 'POST') Http::json(Auth::register(Http::input()), 201);
    if ($path === '/api/auth/login' && $method === 'POST') Http::json(Auth::login(Http::input()));
    if ($path === '/api/auth/logout' && $method === 'POST') Http::json(Auth::logout());
    if ($path === '/api/account/password' && $method === 'PUT') Http::json(Auth::changePassword(Http::input()));
    if ($path === '/api/products' && $method === 'GET') {
        $query = $_GET;
        unset($query['q']);
        Http::json(Store::listedProducts($query));
    }
    if (preg_match('#^/api/products/([1-9][0-9]{0,9})$#D', $path, $matches) && $method === 'GET') Http::json(Store::productById((int)$matches[1]));
    if ($path === '/api/products' && $method === 'POST') Http::json(Admin::createProduct(Http::input()), 201);
    if ($path === '/api/categories' && $method === 'GET') Http::json(Store::categories());
    if ($path === '/api/cart' && $method === 'GET') Http::json(Store::cart((int)Auth::requireUser()['id']));
    if ($path === '/api/cart' && $method === 'POST') Http::json(Store::addToCart(Http::input()));
    if ($path === '/api/cart/coupon' && $method === 'POST') Http::json(Store::coupon(Http::input()));
    if (preg_match('#^/api/cart/([a-z0-9-]{1,120})$#D', $path, $matches) && in_array($method, ['PATCH', 'DELETE'], true)) Http::json(Store::updateCart($matches[1], $method === 'PATCH' ? Http::input() : null));
    if ($path === '/api/orders' && $method === 'POST') Http::json(Store::checkout(Http::input()), 201);
    if ($path === '/api/orders' && $method === 'GET') Http::json(Store::orders());
    if (preg_match('#^/api/orders/([a-f0-9]{32})$#D', $path, $matches) && $method === 'GET') Http::json(Store::order($matches[1], (int)Auth::requireUser()['id']));
    if ($path === '/api/admin/stats' && $method === 'GET') Http::json(Admin::stats());
    if ($path === '/api/admin/users' && $method === 'GET') Http::json(Admin::users());
    if (preg_match('#^/api/admin/users/([1-9][0-9]*)/moderator$#D', $path, $matches) && $method === 'PATCH') Http::json(Admin::moderator((int)$matches[1], Http::input()));
    if ($path === '/api/documentos' && $method === 'GET') Http::json(Store::documents());
    if ($path === '/api/documentos/abrir' && $method === 'GET') Http::json(Store::openDocument($_GET));
    throw new ApiError(404, 'Recurso não encontrado.');
} catch (ApiError $error) {
    Http::error($error);
} catch (Throwable $error) {
    error_log(get_class($error) . ': ' . $error->getMessage());
    Http::error(new ApiError(500, 'Não foi possível concluir a operação. Tente novamente em instantes.'));
}
