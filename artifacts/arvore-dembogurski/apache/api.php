<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
ini_set('display_errors', '0');

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function inputJson(): array
{
    $decoded = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($decoded)) {
        respond(['error' => 'Envie um objeto JSON válido.'], 400);
    }
    return $decoded;
}

function authenticatedUser(): string
{
    $user = trim((string)($_SERVER['REMOTE_USER'] ?? $_SERVER['PHP_AUTH_USER'] ?? ''));
    if ($user === '') {
        respond(['error' => 'Autentique-se para acessar a árvore da família.'], 401);
    }
    return $user;
}

function startUserSession(string $user): void
{
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

    if (!isset($_SESSION['auth_user']) || !hash_equals((string)$_SESSION['auth_user'], $user)) {
        session_regenerate_id(true);
        $_SESSION = ['auth_user' => $user];
    }
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

function isOrganizer(string $user): bool
{
    $configuredUsers = runtimeEnv('TREE_ORGANIZERS');
    if ($configuredUsers === false || trim($configuredUsers) === '') {
        return false;
    }
    $organizers = array_filter(array_map('trim', explode(',', $configuredUsers)));
    return in_array($user, $organizers, true);
}

function requireOrganizer(string $user): void
{
    if (!isOrganizer($user)) {
        respond(['error' => 'Somente organizadores autorizados podem fazer alterações.'], 403);
    }
}

function requireValidCsrfToken(): void
{
    $providedToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $sessionToken = (string)($_SESSION['csrf_token'] ?? '');
    if ($providedToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $providedToken)) {
        respond(['error' => 'A solicitação expirou ou não pôde ser validada. Atualize a página e tente novamente.'], 403);
    }
}

function optionalId(mixed $value, string $field): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        respond(['error' => "O campo {$field} precisa ser um ID válido."], 422);
    }
    return (int)$id;
}

function optionalCoordinate(mixed $value, string $field, float $minimum, float $maximum): ?float
{
    if ($value === null || $value === '') {
        return null;
    }
    if (!is_numeric($value)) {
        respond(['error' => "O campo {$field} precisa ser um número."], 422);
    }
    $number = (float)$value;
    if (!is_finite($number) || $number < $minimum || $number > $maximum) {
        respond(['error' => "O campo {$field} precisa estar entre {$minimum} e {$maximum}."], 422);
    }
    return $number;
}

function cleanText(mixed $value, string $field, int $max, bool $required = false): ?string
{
    if ($value === null) {
        if ($required) {
            respond(['error' => "O campo {$field} é obrigatório."], 422);
        }
        return null;
    }
    if (!is_string($value)) {
        respond(['error' => "O campo {$field} precisa ser texto."], 422);
    }
    $value = trim($value);
    if ($required && $value === '') {
        respond(['error' => "O campo {$field} é obrigatório."], 422);
    }
    if (mb_strlen($value) > $max) {
        respond(['error' => "O campo {$field} ultrapassa o limite de {$max} caracteres."], 422);
    }
    return $value === '' ? null : $value;
}

function optionalDate(mixed $value, string $field): ?string
{
    $date = cleanText($value, $field, 10);
    if ($date !== null) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
            || !checkdate((int)substr($date, 5, 2), (int)substr($date, 8, 2), (int)substr($date, 0, 4))) {
            respond(['error' => "O campo {$field} precisa conter uma data válida no formato AAAA-MM-DD."], 422);
        }
    }
    return $date;
}

function personExists(PDO $pdo, int $id): bool
{
    $query = $pdo->prepare('SELECT 1 FROM pessoas WHERE id = ?');
    $query->execute([$id]);
    return (bool)$query->fetchColumn();
}

function wouldCreateAncestryCycle(PDO $pdo, int $personId, int $parentId): bool
{
    $pending = [$parentId];
    $visited = [];
    $query = $pdo->prepare('SELECT padre_id, madre_id FROM pessoas WHERE id = ?');
    while ($pending) {
        $currentId = array_pop($pending);
        if ($currentId === $personId) {
            return true;
        }
        if (isset($visited[$currentId])) {
            continue;
        }
        $visited[$currentId] = true;
        $query->execute([$currentId]);
        $parents = $query->fetch();
        if (!$parents) {
            continue;
        }
        foreach (['padre_id', 'madre_id'] as $field) {
            if ($parents[$field] !== null) {
                $pending[] = (int)$parents[$field];
            }
        }
    }
    return false;
}

function getTree(PDO $pdo, string $user): never
{
    $query = $pdo->query(
        'SELECT id, nome, sobrenome, sexo, ramo, data_nascimento, data_falecimento,
                cidade, observacoes, padre_id AS pai_id, madre_id AS mae_id,
                conyuge_actual_id AS conjuge_atual_id, latitude, longitude, foto_url
         FROM pessoas
         ORDER BY CASE WHEN ramo = 0 THEN 0 ELSE 1 END, ramo, sobrenome, nome, id'
    );
    $people = array_map(static function (array $row): array {
        foreach (['data_nascimento', 'data_falecimento', 'cidade', 'observacoes', 'pai_id', 'mae_id', 'conjuge_atual_id', 'foto_url'] as $key) {
            if ($row[$key] === null) {
                continue;
            }
            if (in_array($key, ['pai_id', 'mae_id', 'conjuge_atual_id'], true)) {
                $row[$key] = (int)$row[$key];
            }
        }
        $row['id'] = (int)$row['id'];
        $row['ramo'] = (int)$row['ramo'];
        $row['sexo'] = match ($row['sexo']) {
            'M' => 'Masculino',
            'F' => 'Feminino',
            default => $row['sexo'],
        };
        $row['latitude'] = $row['latitude'] === null ? null : (float)$row['latitude'];
        $row['longitude'] = $row['longitude'] === null ? null : (float)$row['longitude'];
        return $row;
    }, $query->fetchAll());
    respond([
        'people' => $people,
        'can_edit' => isOrganizer($user),
        'csrf_token' => $_SESSION['csrf_token'],
    ]);
}

function addPerson(PDO $pdo): never
{
    $body = inputJson();
    $name = cleanText($body['nome'] ?? null, 'nome', 100, true);
    $surname = cleanText($body['sobrenome'] ?? 'Dembogurski', 'sobrenome', 150, true);
    $sex = $body['sexo'] ?? 'Nao informado';
    if (!in_array($sex, ['M', 'F', 'Masculino', 'Feminino', 'Outro', 'Nao informado'], true)) {
        respond(['error' => 'O campo sexo não é válido.'], 422);
    }
    $sex = match ($sex) {
        'Masculino' => 'M',
        'Feminino' => 'F',
        default => $sex,
    };
    $relationship = $body['relationship_type'] ?? 'child';
    if (!in_array($relationship, ['child', 'spouse'], true)) {
        respond(['error' => 'Tipo de vínculo não reconhecido.'], 422);
    }

    $father = optionalId($body['pai_id'] ?? null, 'pai_id');
    $mother = optionalId($body['mae_id'] ?? null, 'mae_id');
    $spouseOf = optionalId($body['linked_person_id'] ?? $body['conjuge_atual_id'] ?? null, 'linked_person_id');
    $latitude = optionalCoordinate($body['latitude'] ?? null, 'latitude', -90, 90);
    $longitude = optionalCoordinate($body['longitude'] ?? null, 'longitude', -180, 180);
    if (($latitude === null) !== ($longitude === null)) {
        respond(['error' => 'Informe latitude e longitude juntas, ou deixe ambas vazias.'], 422);
    }
    if ($relationship === 'child' && $father === null && $mother === null) {
        respond(['error' => 'Informe pelo menos um progenitor biológico.'], 422);
    }
    if ($father !== null && $father === $mother) {
        respond(['error' => 'O pai e a mãe não podem ser a mesma pessoa.'], 422);
    }

    $pdo->beginTransaction();
    try {
        if ($relationship === 'spouse') {
            if ($spouseOf === null || !personExists($pdo, $spouseOf)) {
                respond(['error' => 'Selecione uma pessoa existente para vincular o cônjuge.'], 422);
            }
            if ($spouseOf === $father || $spouseOf === $mother) {
                respond(['error' => 'Uma pessoa não pode ser vinculada como pai/mãe e cônjuge ao mesmo tempo.'], 422);
            }
            $existing = $pdo->prepare('SELECT conyuge_actual_id AS conjuge_atual_id, ramo FROM pessoas WHERE id = ? FOR UPDATE');
            $existing->execute([$spouseOf]);
            $linked = $existing->fetch();
            if ($linked['conjuge_atual_id'] !== null) {
                respond(['error' => 'Essa pessoa já possui um cônjuge atual vinculado.'], 409);
            }
            $branch = (int)$linked['ramo'];
            $father = null;
            $mother = null;
        } else {
            $branches = [];
            foreach ([$father, $mother] as $parentId) {
                if ($parentId !== null) {
                    if (!personExists($pdo, $parentId)) {
                        respond(['error' => 'Um dos progenitores informados não existe.'], 422);
                    }
                    $parentBranch = $pdo->prepare('SELECT ramo FROM pessoas WHERE id = ?');
                    $parentBranch->execute([$parentId]);
                    $branchValue = (int)$parentBranch->fetchColumn();
                    if ($branchValue > 0) {
                        $branches[] = $branchValue;
                    }
                }
            }
            $branchValue = filter_var($body['ramo'] ?? null, FILTER_VALIDATE_INT);
            $branch = $branchValue !== false && $branchValue >= 1 && $branchValue <= 5
                ? (int)$branchValue
                : ($branches[0] ?? 0);
            if ($branch < 1 || $branch > 5) {
                respond(['error' => 'Selecione um dos cinco ramos da família.'], 422);
            }
        }

        $birth = cleanText($body['data_nascimento'] ?? null, 'data_nascimento', 10);
        $death = cleanText($body['data_falecimento'] ?? null, 'data_falecimento', 10);
        foreach (['data_nascimento' => $birth, 'data_falecimento' => $death] as $field => $date) {
            if ($date !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                respond(['error' => "O campo {$field} precisa usar o formato AAAA-MM-DD."], 422);
            }
        }

        $insert = $pdo->prepare(
            'INSERT INTO pessoas
             (nome, sobrenome, sexo, ramo, data_nascimento, data_falecimento, cidade, observacoes, padre_id, madre_id, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $name, $surname, $sex, $branch, $birth, $death,
            cleanText($body['cidade'] ?? null, 'cidade', 160),
            cleanText($body['observacoes'] ?? null, 'observacoes', 4000),
            $father, $mother, $latitude, $longitude,
        ]);
        $newId = (int)$pdo->lastInsertId();
        if ($relationship === 'spouse' && $spouseOf !== null) {
            $link = $pdo->prepare('UPDATE pessoas SET conyuge_actual_id = ? WHERE id = ?');
            $link->execute([$newId, $spouseOf]);
            $link->execute([$spouseOf, $newId]);
        }
        $pdo->commit();

        $query = $pdo->prepare(
            'SELECT id, nome, sobrenome, sexo, ramo, data_nascimento, data_falecimento,
                    cidade, observacoes, padre_id AS pai_id, madre_id AS mae_id,
                    conyuge_actual_id AS conjuge_atual_id, latitude, longitude, foto_url
             FROM pessoas WHERE id = ?'
        );
        $query->execute([$newId]);
        $person = $query->fetch();
        foreach (['id', 'ramo', 'pai_id', 'mae_id', 'conjuge_atual_id'] as $key) {
            $person[$key] = $person[$key] === null ? null : (int)$person[$key];
        }
        $person['sexo'] = match ($person['sexo']) {
            'M' => 'Masculino',
            'F' => 'Feminino',
            default => $person['sexo'],
        };
        $person['latitude'] = $person['latitude'] === null ? null : (float)$person['latitude'];
        $person['longitude'] = $person['longitude'] === null ? null : (float)$person['longitude'];
        respond($person, 201);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

function updatePerson(PDO $pdo): never
{
    $body = inputJson();
    $personId = filter_var($body['person_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($personId === false) {
        respond(['error' => 'Informe o ID da pessoa.'], 422);
    }
    $personId = (int)$personId;
    if (!personExists($pdo, $personId)) {
        respond(['error' => 'Pessoa não encontrada.'], 404);
    }

    $name = cleanText($body['nome'] ?? null, 'nome', 100, true);
    $surname = cleanText($body['sobrenome'] ?? null, 'sobrenome', 150, true);
    $sex = $body['sexo'] ?? 'Nao informado';
    if (!in_array($sex, ['M', 'F', 'Masculino', 'Feminino', 'Outro', 'Nao informado'], true)) {
        respond(['error' => 'O campo sexo não é válido.'], 422);
    }
    $sex = match ($sex) {
        'Masculino' => 'M',
        'Feminino' => 'F',
        default => $sex,
    };

    $father = optionalId($body['pai_id'] ?? null, 'pai_id');
    $mother = optionalId($body['mae_id'] ?? null, 'mae_id');
    if ($father === $personId || $mother === $personId) {
        respond(['error' => 'Uma pessoa não pode ser o próprio pai ou mãe.'], 422);
    }
    if ($father !== null && $father === $mother) {
        respond(['error' => 'O pai e a mãe não podem ser a mesma pessoa.'], 422);
    }
    foreach ([$father, $mother] as $parentId) {
        if ($parentId === null) {
            continue;
        }
        if (!personExists($pdo, $parentId)) {
            respond(['error' => 'Um dos progenitores informados não existe.'], 422);
        }
        if (wouldCreateAncestryCycle($pdo, $personId, $parentId)) {
            respond(['error' => 'Essa alteração criaria um ciclo na árvore genealógica.'], 422);
        }
    }

    $birth = optionalDate($body['data_nascimento'] ?? null, 'data_nascimento');
    $death = optionalDate($body['data_falecimento'] ?? null, 'data_falecimento');
    if ($birth !== null && $death !== null && $death < $birth) {
        respond(['error' => 'A data de falecimento não pode ser anterior à data de nascimento.'], 422);
    }

    $update = $pdo->prepare(
        'UPDATE pessoas
         SET nome = ?, sobrenome = ?, sexo = ?, data_nascimento = ?, data_falecimento = ?,
             cidade = ?, observacoes = ?, padre_id = ?, madre_id = ?
         WHERE id = ?'
    );
    $update->execute([
        $name,
        $surname,
        $sex,
        $birth,
        $death,
        cleanText($body['cidade'] ?? null, 'cidade', 160),
        cleanText($body['observacoes'] ?? null, 'observacoes', 4000),
        $father,
        $mother,
        $personId,
    ]);

    $query = $pdo->prepare(
        'SELECT id, nome, sobrenome, sexo, ramo, data_nascimento, data_falecimento,
                cidade, observacoes, padre_id AS pai_id, madre_id AS mae_id,
                conyuge_actual_id AS conjuge_atual_id, latitude, longitude, foto_url
         FROM pessoas WHERE id = ?'
    );
    $query->execute([$personId]);
    $person = $query->fetch();
    if (!$person) {
        respond(['error' => 'Pessoa não encontrada após a atualização.'], 404);
    }
    foreach (['id', 'ramo', 'pai_id', 'mae_id', 'conjuge_atual_id'] as $key) {
        $person[$key] = $person[$key] === null ? null : (int)$person[$key];
    }
    $person['sexo'] = match ($person['sexo']) {
        'M' => 'Masculino',
        'F' => 'Feminino',
        default => $person['sexo'],
    };
    $person['latitude'] = $person['latitude'] === null ? null : (float)$person['latitude'];
    $person['longitude'] = $person['longitude'] === null ? null : (float)$person['longitude'];
    respond($person);
}

function updateLocation(PDO $pdo): never
{
    $body = inputJson();
    $personId = filter_var($body['person_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($personId === false) {
        respond(['error' => 'Informe o ID da pessoa.'], 422);
    }
    if (!personExists($pdo, (int)$personId)) {
        respond(['error' => 'Pessoa não encontrada.'], 404);
    }
    $latitude = optionalCoordinate($body['latitude'] ?? null, 'latitude', -90, 90);
    $longitude = optionalCoordinate($body['longitude'] ?? null, 'longitude', -180, 180);
    if (($latitude === null) !== ($longitude === null)) {
        respond(['error' => 'Informe latitude e longitude juntas, ou deixe ambas vazias.'], 422);
    }
    $update = $pdo->prepare('UPDATE pessoas SET latitude = ?, longitude = ? WHERE id = ?');
    $update->execute([$latitude, $longitude, (int)$personId]);
    respond(['latitude' => $latitude, 'longitude' => $longitude]);
}

function deletePerson(PDO $pdo): never
{
    $body = inputJson();
    $personId = filter_var($body['person_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($personId === false) {
        respond(['error' => 'Informe o ID da pessoa.'], 422);
    }
    $personId = (int)$personId;
    $rawExpectedIds = $body['expected_descendant_ids'] ?? null;
    if (!is_array($rawExpectedIds) || !array_is_list($rawExpectedIds) || count($rawExpectedIds) > 100000) {
        respond(['error' => 'Atualize a árvore antes de confirmar a remoção.'], 422);
    }
    $expectedIds = [];
    foreach ($rawExpectedIds as $value) {
        $expectedId = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($expectedId === false) {
            respond(['error' => 'A lista de descendentes precisa conter IDs válidos.'], 422);
        }
        $expectedIds[(int)$expectedId] = true;
    }
    if (!isset($expectedIds[$personId])) {
        respond(['error' => 'A pessoa selecionada não corresponde à confirmação. Atualize a árvore e tente novamente.'], 422);
    }

    $pdo->beginTransaction();
    try {
        $rows = $pdo->query('SELECT id, padre_id, madre_id FROM pessoas FOR UPDATE')->fetchAll();
        $childrenByParent = [];
        $personExists = false;
        foreach ($rows as $row) {
            $id = (int)$row['id'];
            if ($id === $personId) {
                $personExists = true;
            }
            foreach (['padre_id', 'madre_id'] as $field) {
                if ($row[$field] === null) {
                    continue;
                }
                $parentId = (int)$row[$field];
                $childrenByParent[$parentId][] = $id;
            }
        }
        if (!$personExists) {
            $pdo->rollBack();
            respond(['error' => 'Pessoa não encontrada.'], 404);
        }

        $idsToDelete = [$personId => true];
        $pending = [$personId];
        while ($pending) {
            $parentId = array_pop($pending);
            foreach ($childrenByParent[$parentId] ?? [] as $childId) {
                if (isset($idsToDelete[$childId])) {
                    continue;
                }
                $idsToDelete[$childId] = true;
                $pending[] = $childId;
            }
        }

        $deletedIds = array_map('intval', array_keys($idsToDelete));
        $expectedIdList = array_map('intval', array_keys($expectedIds));
        sort($deletedIds, SORT_NUMERIC);
        sort($expectedIdList, SORT_NUMERIC);
        if ($deletedIds !== $expectedIdList) {
            $pdo->rollBack();
            respond(['error' => 'A árvore mudou desde a confirmação. Atualize-a e reveja os descendentes antes de remover.'], 409);
        }
        $placeholders = implode(', ', array_fill(0, count($deletedIds), '?'));
        $delete = $pdo->prepare('DELETE FROM pessoas WHERE id IN (' . $placeholders . ')');
        $delete->execute($deletedIds);
        if ($delete->rowCount() !== count($deletedIds)) {
            throw new RuntimeException('The family-tree deletion did not remove the expected records.');
        }
        $pdo->commit();
        respond([
            'deleted_ids' => $deletedIds,
            'deleted_count' => count($deletedIds),
            'descendant_count' => count($deletedIds) - 1,
        ]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

function uploadPhoto(PDO $pdo): never
{
    $personId = filter_var($_POST['person_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($personId === false) {
        respond(['error' => 'Informe o ID da pessoa.'], 422);
    }
    if (!personExists($pdo, (int)$personId)) {
        respond(['error' => 'Pessoa não encontrada.'], 404);
    }
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        respond(['error' => 'Selecione uma foto JPG ou PNG válida.'], 422);
    }
    $file = $_FILES['photo'];
    if ($file['size'] > 8 * 1024 * 1024) {
        respond(['error' => 'A foto precisa ter no máximo 8 MB.'], 413);
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
    if (!isset($extensions[$mime]) || getimagesize($file['tmp_name']) === false) {
        respond(['error' => 'Formato não permitido. Envie uma imagem JPG ou PNG.'], 415);
    }

    $directory = __DIR__ . '/uploads';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        respond(['error' => 'Não foi possível preparar a pasta de fotos.'], 500);
    }
    $filename = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $filename)) {
        respond(['error' => 'Não foi possível salvar a foto.'], 500);
    }
    $relativeUrl = './uploads/' . $filename;
    $update = $pdo->prepare('UPDATE pessoas SET foto_url = ? WHERE id = ?');
    $update->execute([$relativeUrl, (int)$personId]);
    respond(['foto_url' => $relativeUrl]);
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? '';
    $user = authenticatedUser();
    startUserSession($user);
    if ($method === 'POST') {
        requireOrganizer($user);
        requireValidCsrfToken();
    }
    $pdo = db();
    if ($method === 'GET' && $action === 'get_tree') {
        getTree($pdo, $user);
    }
    if ($method === 'POST' && $action === 'add_person') {
        addPerson($pdo);
    }
    if ($method === 'POST' && $action === 'update_person') {
        updatePerson($pdo);
    }
    if ($method === 'POST' && $action === 'update_location') {
        updateLocation($pdo);
    }
    if ($method === 'POST' && $action === 'delete_person') {
        deletePerson($pdo);
    }
    if ($method === 'POST' && $action === 'upload_photo') {
        uploadPhoto($pdo);
    }
    header('Allow: GET, POST');
    respond(['error' => 'Endpoint não encontrado.'], 404);
} catch (PDOException $error) {
    error_log('Family tree database operation failed (SQLSTATE ' . (string)$error->getCode() . ').');
    respond(['error' => 'O serviço da árvore está temporariamente indisponível.'], 500);
} catch (Throwable $error) {
    error_log('Family tree API operation failed.');
    respond(['error' => 'Ocorreu um erro inesperado ao processar a solicitação.'], 500);
}