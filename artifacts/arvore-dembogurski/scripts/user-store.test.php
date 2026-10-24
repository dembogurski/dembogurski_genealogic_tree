<?php
declare(strict_types=1);

require_once __DIR__ . '/../apache/db.php';
require_once __DIR__ . '/../apache/user-store.php';

$directory = sys_get_temp_dir() . '/tree-users-test-' . bin2hex(random_bytes(8));
mkdir($directory, 0700);
$checks = 0;
function check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) throw new RuntimeException($message);
    $checks++;
}
function rejects(callable $operation, int $status): void
{
    try {
        $operation();
    } catch (UserManagementException $error) {
        check($error->status === $status, 'Unexpected rejection status.');
        return;
    }
    throw new RuntimeException('Operation should have been rejected.');
}

try {
    file_put_contents($directory . '/users.htpasswd', 'admin:' . password_hash('initial-password', PASSWORD_BCRYPT) . "\n");
    $store = new TreeUserStore($directory, ['admin']);
    check($store->isAdmin('admin'), 'Existing Apache administrator must be preserved.');
    check(!$store->isAdmin('unknown'), 'Unknown users cannot edit.');
    check($store->list('admin') === [['username' => 'admin', 'role' => 'admin']], 'List must never expose password hashes.');
    $reader = ['username' => 'leitor', 'role' => 'reader', 'password' => 'reader-pass', 'create' => true];
    $store->save('admin', $reader);
    check(!$store->isAdmin('leitor'), 'Readers must not edit.');
    rejects(fn() => $store->list('leitor'), 403);
    rejects(fn() => $store->save('leitor', ['username' => 'leitor', 'role' => 'admin', 'password' => '', 'create' => false]), 403);
    rejects(fn() => $store->delete('leitor', 'admin'), 403);
    rejects(fn() => $store->save('admin', $reader), 409);
    rejects(fn() => $store->save('admin', [...$reader, 'username' => 'LEITOR']), 409);
    rejects(fn() => $store->save('admin', [...$reader, 'username' => "bad\nname"]), 422);
    rejects(fn() => $store->save('admin', [...$reader, 'username' => 'bad:name']), 422);
    rejects(fn() => $store->save('admin', [...$reader, 'password' => '']), 422);
    rejects(fn() => $store->save('admin', [...$reader, 'password' => 'short']), 422);
    rejects(fn() => $store->save('admin', [...$reader, 'password' => str_repeat('á', 37)]), 422);
    rejects(fn() => $store->save('admin', [...$reader, 'password' => "long\0password"]), 422);
    rejects(fn() => $store->save('admin', [...$reader, 'role' => 'owner']), 422);
    rejects(fn() => $store->save('admin', ['username' => 'admin', 'role' => 'reader', 'password' => '', 'create' => false]), 409);
    rejects(fn() => $store->delete('admin', 'admin'), 409);
    $credentials = file_get_contents($directory . '/users.htpasswd');
    preg_match('/^leitor:(.+)$/m', $credentials, $match);
    $originalReaderHash = $match[1];
    check(password_verify('reader-pass', $originalReaderHash), 'Created password must authenticate with bcrypt.');
    $store->save('admin', ['username' => 'leitor', 'role' => 'admin', 'password' => '', 'create' => false]);
    check($store->isAdmin('leitor'), 'Role changes must apply without an Apache restart.');
    check(str_contains(file_get_contents($directory . '/users.htpasswd'), $originalReaderHash), 'Empty password must preserve the existing password.');
    $store->save('admin', ['username' => 'leitor', 'role' => 'reader', 'password' => 'new-reader-pass', 'create' => false]);
    check(!$store->isAdmin('leitor'), 'Stored role must override the previous role.');
    preg_match('/^leitor:(.+)$/m', file_get_contents($directory . '/users.htpasswd'), $match);
    check(password_verify('new-reader-pass', $match[1]) && !password_verify('reader-pass', $match[1]), 'Reset must invalidate the old password.');
    $store->save('admin', [...$reader, 'username' => '123']);
    check(in_array(['username' => '123', 'role' => 'reader'], $store->list('admin'), true), 'Numeric usernames must remain strings in the response.');
    $store->delete('admin', '123');
    $store->delete('admin', 'leitor');
    check(count($store->list('admin')) === 1, 'Deletion must remove the account and its role.');
    rejects(fn() => $store->save('admin', ['username' => 'missing', 'role' => 'reader', 'password' => '', 'create' => false]), 404);
    rejects(fn() => $store->delete('admin', 'missing'), 404);
    check(password_verify('initial-password', explode(':', trim(file_get_contents($directory . '/users.htpasswd')), 2)[1]), 'Administrator password must remain unchanged.');
    echo "User store: {$checks} checks passed.\n";
} finally {
    foreach (glob($directory . '/*') as $file) unlink($file);
    rmdir($directory);
}
