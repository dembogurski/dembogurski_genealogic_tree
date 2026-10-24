<?php
declare(strict_types=1);

final class UserManagementException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}

/** Apache keeps authenticating against users.htpasswd; roles are read on each request. */
final class TreeUserStore
{
    public function __construct(private readonly string $directory, private readonly array $initialAdmins)
    {
    }

    private function locked(callable $operation, bool $write = false): mixed
    {
        $lock = fopen($this->directory . '/users.lock', 'c');
        if ($lock === false) {
            throw new UserManagementException('Não foi possível acessar o cadastro de usuários.', 503);
        }
        try {
            if (!flock($lock, $write ? LOCK_EX : LOCK_SH)) {
                throw new UserManagementException('O cadastro está ocupado. Tente novamente.', 503);
            }
            return $operation();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function credentials(): array
    {
        $contents = file_get_contents($this->directory . '/users.htpasswd');
        if ($contents === false) {
            throw new UserManagementException('Não foi possível ler os usuários do Apache.', 503);
        }
        $users = [];
        foreach (preg_split('/\r?\n/', $contents) as $line) {
            if (trim($line) === '' || str_starts_with($line, '#')) continue;
            $parts = explode(':', $line, 2);
            if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '' || isset($users[$parts[0]])) {
                throw new UserManagementException('O arquivo de usuários precisa ser revisado no servidor.', 503);
            }
            $users[$parts[0]] = $parts[1];
        }
        return $users;
    }

    private function roles(array $credentials): array
    {
        $path = $this->directory . '/users-roles.json';
        $saved = [];
        if (is_file($path)) {
            $saved = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($saved)) {
                throw new UserManagementException('O arquivo de permissões precisa ser revisado no servidor.', 503);
            }
        }
        $roles = [];
        foreach ($credentials as $username => $_hash) {
            $role = $saved[$username] ?? (in_array($username, $this->initialAdmins, true) ? 'admin' : 'reader');
            if (!in_array($role, ['admin', 'reader'], true)) {
                throw new UserManagementException('O arquivo de permissões contém um perfil inválido.', 503);
            }
            $roles[$username] = $role;
        }
        return $roles;
    }

    private function requireAdmin(string $actor, array $roles): void
    {
        if (($roles[$actor] ?? null) !== 'admin') {
            throw new UserManagementException('Somente administradores podem administrar usuários.', 403);
        }
    }

    private function publicUsers(array $roles): array
    {
        ksort($roles, SORT_NATURAL | SORT_FLAG_CASE);
        return array_map(static fn(string|int $username, string $role): array => [
            'username' => (string)$username, 'role' => $role,
        ], array_keys($roles), array_values($roles));
    }

    public function isAdmin(string $username): bool
    {
        return $this->locked(fn(): bool => ($this->roles($this->credentials())[$username] ?? null) === 'admin');
    }

    public function list(string $actor): array
    {
        return $this->locked(function () use ($actor): array {
            $roles = $this->roles($this->credentials());
            $this->requireAdmin($actor, $roles);
            return $this->publicUsers($roles);
        });
    }

    private function atomicWrite(string $path, string $contents): void
    {
        $temporary = tempnam($this->directory, '.users-');
        if ($temporary === false) {
            throw new UserManagementException('Não foi possível preparar o cadastro de usuários.', 503);
        }
        try {
            chmod($temporary, 0600);
            if (file_put_contents($temporary, $contents) !== strlen($contents) || !rename($temporary, $path)) {
                throw new UserManagementException('Não foi possível salvar o cadastro de usuários.', 503);
            }
        } finally {
            if (is_file($temporary)) unlink($temporary);
        }
    }

    private function persist(array $credentials, array $roles): void
    {
        $rolePath = $this->directory . '/users-roles.json';
        $previousRoles = is_file($rolePath) ? file_get_contents($rolePath) : null;
        $lines = [];
        foreach ($credentials as $username => $hash) $lines[] = $username . ':' . $hash;
        // Readers of roles use the same lock. Apache always sees a complete password file.
        $this->atomicWrite($rolePath, json_encode((object)$roles, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . "\n");
        try {
            $this->atomicWrite($this->directory . '/users.htpasswd', implode("\n", $lines) . "\n");
        } catch (Throwable $error) {
            if ($previousRoles === null) unlink($rolePath);
            elseif (is_string($previousRoles)) $this->atomicWrite($rolePath, $previousRoles);
            throw $error;
        }
    }

    public function save(string $actor, array $body): array
    {
        $username = $body['username'] ?? null;
        $role = $body['role'] ?? null;
        $password = $body['password'] ?? '';
        $create = $body['create'] ?? null;
        if (!is_string($username) || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/D', $username)) {
            throw new UserManagementException('Use até 64 letras sem acentos, números, ponto, hífen ou sublinhado no usuário.');
        }
        if (!in_array($role, ['admin', 'reader'], true) || !is_bool($create)) {
            throw new UserManagementException('Selecione um perfil válido.');
        }
        if (!is_string($password) || str_contains($password, "\0")
            || ($password !== '' && (strlen($password) < 8 || strlen($password) > 72))) {
            throw new UserManagementException('A senha deve ter de 8 a 72 bytes.');
        }
        if ($create && $password === '') {
            throw new UserManagementException('Informe uma senha para o novo usuário.');
        }
        return $this->locked(function () use ($actor, $username, $role, $password, $create): array {
            $credentials = $this->credentials();
            $roles = $this->roles($credentials);
            $this->requireAdmin($actor, $roles);
            if ($create) {
                foreach (array_keys($credentials) as $existing) {
                    if (strcasecmp((string)$existing, $username) === 0) {
                        throw new UserManagementException('Esse nome de usuário já está cadastrado.', 409);
                    }
                }
            } elseif (!isset($credentials[$username])) {
                throw new UserManagementException('Usuário não encontrado.', 404);
            }
            if ($username === $actor && $role !== 'admin') {
                throw new UserManagementException('Você não pode retirar seu próprio acesso de administrador.', 409);
            }
            $roles[$username] = $role;
            if (!in_array('admin', $roles, true)) {
                throw new UserManagementException('Mantenha pelo menos um administrador.', 409);
            }
            if ($password !== '') {
                $credentials[$username] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            }
            $this->persist($credentials, $roles);
            return $this->publicUsers($roles);
        }, true);
    }

    public function delete(string $actor, string $username): array
    {
        return $this->locked(function () use ($actor, $username): array {
            $credentials = $this->credentials();
            $roles = $this->roles($credentials);
            $this->requireAdmin($actor, $roles);
            if (!isset($credentials[$username])) {
                throw new UserManagementException('Usuário não encontrado.', 404);
            }
            if ($actor === $username) {
                throw new UserManagementException('Você não pode excluir seu próprio usuário.', 409);
            }
            unset($credentials[$username], $roles[$username]);
            if (!in_array('admin', $roles, true)) {
                throw new UserManagementException('Mantenha pelo menos um administrador.', 409);
            }
            $this->persist($credentials, $roles);
            return $this->publicUsers($roles);
        }, true);
    }
}

function treeUserStore(): ?TreeUserStore
{
    $configured = runtimeEnv('TREE_USERS_DIR');
    // WAMP stores credentials beside www, outside the publicly served directory.
    $documentRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
    $directory = $configured ?: ($documentRoot ? dirname($documentRoot) . '/private/dembogurski' : '');
    $resolved = $directory !== '' ? realpath($directory) : false;
    if ($resolved === false || !is_file($resolved . '/users.htpasswd')) {
        if ($configured) throw new UserManagementException('Configure a pasta privada de usuários no servidor.', 503);
        return null;
    }
    foreach (array_filter([$documentRoot, realpath(__DIR__)]) as $publicPath) {
        $privatePath = strtolower(str_replace('\\', '/', $resolved)) . '/';
        $publicPath = strtolower(str_replace('\\', '/', $publicPath)) . '/';
        if (str_starts_with($privatePath, $publicPath)) {
            throw new UserManagementException('O cadastro de usuários deve ficar fora da pasta pública.', 503);
        }
    }
    $initialAdmins = array_filter(array_map('trim', explode(',', runtimeEnv('TREE_ORGANIZERS') ?: '')));
    return new TreeUserStore($resolved, $initialAdmins);
}
