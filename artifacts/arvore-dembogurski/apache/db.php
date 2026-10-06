<?php
declare(strict_types=1);

function runtimeEnv(string $key): string|false
{
    $value = getenv($key);
    if ($value !== false) {
        return $value;
    }
    return isset($_SERVER[$key]) ? (string)$_SERVER[$key] : false;
}

/**
 * Configure DB_HOST, DB_NAME, DB_USER e DB_PASS no ambiente do PHP/Apache.
 * DB_PORT é opcional e usa 3306 quando não informado.
 */
function db(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $host = runtimeEnv('DB_HOST');
    $name = runtimeEnv('DB_NAME');
    $user = runtimeEnv('DB_USER');
    $password = runtimeEnv('DB_PASS');
    foreach (['DB_HOST' => $host, 'DB_NAME' => $name, 'DB_USER' => $user, 'DB_PASS' => $password] as $key => $value) {
        if ($value === false || trim($value) === '') {
            throw new RuntimeException('Database environment is not configured.');
        }
    }
    $port = runtimeEnv('DB_PORT') ?: '3306';
    if (filter_var($port, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]) === false) {
        throw new RuntimeException('Database port is invalid.');
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $connection = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $connection;
}