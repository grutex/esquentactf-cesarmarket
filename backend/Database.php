<?php
declare(strict_types=1);

namespace Market;

use PDO;

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $host = getenv('DB_HOST') ?: 'database';
            $port = (int)(getenv('DB_PORT') ?: 3306);
            $database = getenv('DB_DATABASE') ?: 'cesar_market';
            self::$connection = new PDO(
                "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
                getenv('DB_USERNAME') ?: 'cesar_market',
                getenv('DB_PASSWORD') ?: '',
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
            self::$connection->exec("SET time_zone = '+00:00'");
        }
        return self::$connection;
    }

    public static function query(string $sql, array $parameters = []): \PDOStatement
    {
        $statement = self::connection()->prepare($sql);
        $statement->execute($parameters);
        return $statement;
    }

    public static function seedData(): array
    {
        static $data = null;
        if ($data === null) {
            $path = dirname(__DIR__) . '/infra/database/catalogo.json';
            $data = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        }
        return $data;
    }

    public static function money(int $cents): string
    {
        return ($cents < 0 ? '-' : '') . sprintf('%d.%02d', intdiv(abs($cents), 100), abs($cents % 100));
    }
}
