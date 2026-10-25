<?php
declare(strict_types=1);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Referrer-Policy: same-origin');

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('dembogurski_tree');
$scriptDirectory = dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'));
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $scriptDirectory === '.' ? '/' : $scriptDirectory,
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

$user = trim((string)($_SERVER['REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? ''));
if ($user === '') {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Autenticação necessária.');
}

session_regenerate_id(true);
$_SESSION = [
    'auth_user' => $user,
    'csrf_token' => bin2hex(random_bytes(32)),
];

header('Location: ./', true, 303);
exit;
