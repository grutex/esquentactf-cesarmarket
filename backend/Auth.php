<?php
declare(strict_types=1);

namespace Market;

use PDOException;

final class Auth
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('cesar_market_session');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => filter_var(getenv('SESSION_SECURE') ?: 'false', FILTER_VALIDATE_BOOLEAN),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
        $_SESSION['checkout_token'] ??= bin2hex(random_bytes(24));
    }

    public static function user(): ?array
    {
        $id = $_SESSION['user_id'] ?? null;
        return is_int($id) ? (Database::query('SELECT * FROM users WHERE id = ?', [$id])->fetch() ?: null) : null;
    }

    public static function requireUser(array $roles = []): array
    {
        $user = self::user();
        if (!$user) {
            throw new ApiError(401, 'Entre na sua conta para continuar.');
        }
        if ($roles && !in_array($user['role'], $roles, true)) {
            throw new ApiError(403, 'Sua conta não tem permissão para acessar esta área.');
        }
        return $user;
    }

    public static function csrf(): void
    {
        $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($provided) || !hash_equals($_SESSION['csrf'] ?? '', $provided)) {
            throw new ApiError(419, 'Sua sessão precisa ser atualizada. Recarregue a página e tente novamente.');
        }
    }

    public static function publicUser(?array $user): ?array
    {
        if (!$user) {
            return null;
        }
        return ['id' => (int)$user['id'], 'name' => $user['name'], 'login' => $user['login'], 'role' => $user['role']];
    }

    public static function password(array $input, string $field = 'password'): string
    {
        $password = $input[$field] ?? '';
        if (!is_string($password) || strlen($password) < 10 || strlen($password) > 72) {
            throw new ApiError(422, 'Use uma senha entre 10 e 72 caracteres.', [$field => 'A senha deve ter entre 10 e 72 caracteres.']);
        }
        return $password;
    }

    private static function authenticate(int $id): array
    {
        session_regenerate_id(true);
        $_SESSION = ['user_id' => $id, 'csrf' => bin2hex(random_bytes(32)), 'checkout_token' => bin2hex(random_bytes(24))];
        return ['user' => self::publicUser(self::requireUser()), 'csrf' => $_SESSION['csrf']];
    }

    public static function register(array $input): array
    {
        Http::allowed($input, ['name', 'login', 'password', 'password_confirmation']);
        $name = Http::string($input, 'name', 2, 100, 'nome');
        $login = Http::login($input);
        $password = self::password($input);
        if (($input['password_confirmation'] ?? null) !== $password) {
            throw new ApiError(422, 'As senhas não coincidem.');
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        // Crédito inicial padrão do CTF: R$ 50,00, concedido apenas no cadastro.
        $credit = max(0, min(100000000, (int)(getenv('WELCOME_CREDIT_CENTS') !== false ? getenv('WELCOME_CREDIT_CENTS') : 5000)));
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            Database::query("INSERT INTO users (name,login,password_hash,role,wallet_cents) VALUES (?,?,?,'user',?)", [$name, $login, $hash, $credit]);
            $id = (int)$pdo->lastInsertId();
            Database::query('INSERT INTO carts (user_id) VALUES (?)', [$id]);
            if ($credit > 0) {
                Database::query('INSERT INTO wallet_entries (user_id,amount_cents,description) VALUES (?,?,?)', [$id, $credit, 'Saldo virtual de boas-vindas']);
            }
            $pdo->commit();
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($error instanceof PDOException && ($error->errorInfo[1] ?? 0) === 1062) {
                throw new ApiError(422, 'Este login já está cadastrado.', ['login' => 'Use outro login ou entre na sua conta.']);
            }
            throw $error;
        }
        return self::authenticate($id);
    }

    public static function login(array $input): array
    {
        Http::allowed($input, ['login', 'password']);
        $login = Http::login($input);
        $password = $input['password'] ?? '';
        if (!is_string($password) || strlen($password) > 200) throw new ApiError(401, 'Login ou senha incorretos.');
        $fingerprint = hash('sha256', $login . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
        $attempt = Database::query('SELECT attempts,started_at FROM login_attempts WHERE fingerprint=?', [$fingerprint])->fetch();
        if ($attempt && (strtotime($attempt['started_at']) ?: 0) > time() - 900 && (int)$attempt['attempts'] >= 10) {
            throw new ApiError(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
        }
        $user = Database::query('SELECT * FROM users WHERE login = ?', [$login])->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Database::query('INSERT INTO login_attempts (fingerprint,attempts,started_at) VALUES (?,1,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE attempts=IF(started_at < UTC_TIMESTAMP()-INTERVAL 15 MINUTE,1,attempts+1),started_at=IF(started_at < UTC_TIMESTAMP()-INTERVAL 15 MINUTE,UTC_TIMESTAMP(),started_at)', [$fingerprint]);
            throw new ApiError(401, 'Login ou senha incorretos.');
        }
        Database::query('DELETE FROM login_attempts WHERE fingerprint=?', [$fingerprint]);
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            Database::query('UPDATE users SET password_hash=? WHERE id=?', [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        return self::authenticate((int)$user['id']);
    }

    public static function logout(): array
    {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        $_SESSION['checkout_token'] = bin2hex(random_bytes(24));
        return ['csrf' => $_SESSION['csrf']];
    }

    public static function changePassword(array $input): array
    {
        $user = self::requireUser();
        Http::allowed($input, ['current_password', 'password', 'password_confirmation']);
        if (!is_string($input['current_password'] ?? null) || !password_verify($input['current_password'], $user['password_hash'])) {
            throw new ApiError(422, 'A senha atual está incorreta.');
        }
        $password = self::password($input);
        if (($input['password_confirmation'] ?? null) !== $password) throw new ApiError(422, 'As senhas não coincidem.');
        Database::query('UPDATE users SET password_hash=? WHERE id=?', [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return ['message' => 'Senha atualizada.', 'csrf' => $_SESSION['csrf']];
    }
}
