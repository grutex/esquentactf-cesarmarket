<?php
declare(strict_types=1);

namespace Market;

final class ApiError extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message, public readonly array $fields = [])
    {
        parent::__construct($message);
    }
}

final class Http
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }

    public static function error(ApiError $error): never
    {
        http_response_code($error->status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => false, 'message' => $error->getMessage(), 'errors' => $error->fields], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function input(): array
    {
        if (str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data')) {
            return $_POST;
        }
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            throw new ApiError(415, 'Envie os dados em JSON.');
        }
        $body = (string)file_get_contents('php://input');
        if (strlen($body) > 65536) {
            throw new ApiError(413, 'A requisição é muito grande.');
        }
        try {
            $value = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ApiError(400, 'JSON inválido.');
        }
        if (!is_array($value) || ($value !== [] && array_is_list($value))) {
            throw new ApiError(400, 'Envie um objeto JSON.');
        }
        return $value;
    }

    public static function allowed(array $input, array $names): void
    {
        if (array_diff(array_keys($input), $names)) {
            throw new ApiError(422, 'A requisição contém campos não permitidos.');
        }
    }

    public static function string(array $input, string $key, int $minimum, int $maximum, string $label = ''): string
    {
        $value = $input[$key] ?? '';
        $label = $label ?: $key;
        if (!is_string($value)) {
            throw new ApiError(422, "Confira o campo {$label}.", [$key => 'Informe um texto válido.']);
        }
        $value = trim($value);
        $count = preg_match_all('/./us', $value);
        if ($count === false || $count < $minimum || $count > $maximum || str_contains($value, "\0")) {
            throw new ApiError(422, "Confira o campo {$label}.", [$key => "Use entre {$minimum} e {$maximum} caracteres."]);
        }
        return $value;
    }

    public static function login(array $input): string
    {
        $login = strtolower(self::string($input, 'login', 3, 190, 'login'));
        // Identificadores em formato de e-mail continuam válidos para as contas existentes.
        if (!preg_match('/^[a-z0-9][a-z0-9._-]{2,189}$/D', $login) && !filter_var($login, FILTER_VALIDATE_EMAIL)) {
            throw new ApiError(422, 'Use um login com pelo menos 3 caracteres, sem espaços.', ['login' => 'Use letras, números, ponto, hífen ou sublinhado.']);
        }
        return $login;
    }

    public static function email(array $input, string $key = 'email'): string
    {
        $email = strtolower(self::string($input, $key, 3, 190, 'e-mail'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiError(422, 'Informe um e-mail válido.', [$key => 'E-mail inválido.']);
        }
        return $email;
    }

    public static function quantity(mixed $value): int
    {
        if (!is_int($value) || $value < 1 || $value > 100) {
            throw new ApiError(422, 'A quantidade deve ser um número inteiro entre 1 e 100.');
        }
        return $value;
    }

    public static function checkoutPrice(mixed $value): int
    {
        if (is_int($value) || is_float($value)) $value = (string)$value;
        if (!is_string($value) || !preg_match('/^-?\d{1,12}(?:[.,]\d{1,2})?$/D', $value)) {
            throw new ApiError(422, 'Informe o preço com até duas casas decimais.');
        }
        $negative = str_starts_with($value, '-');
        $parts = explode('.', str_replace(',', '.', ltrim($value, '-')));
        $cents = (int)$parts[0] * 100 + (int)str_pad($parts[1] ?? '', 2, '0');
        return $negative ? -$cents : $cents;
    }

    public static function price(mixed $value, bool $optional = false): ?int
    {
        if ($optional && ($value === '' || $value === null)) {
            return null;
        }
        if (!is_string($value) || !preg_match('/^\d{1,6}(?:[.,]\d{1,2})?$/D', $value)) {
            throw new ApiError(422, 'Informe um preço válido, como 12,90.');
        }
        $parts = explode('.', str_replace(',', '.', $value));
        $cents = (int)$parts[0] * 100 + (int)str_pad($parts[1] ?? '', 2, '0');
        if ($cents < 1 || $cents > 99999999) {
            throw new ApiError(422, 'O preço deve ser maior que zero e menor que R$ 1.000.000,00.');
        }
        return $cents;
    }
}
