param(
    [string]$BaseUri = 'http://localhost/dembogurski',
    [string]$CredentialsFile = 'C:/wamp/private/dembogurski/acceso-local.txt'
)
$ErrorActionPreference = 'Stop'
$credentialText = Get-Content -LiteralPath $CredentialsFile -Raw
$adminUsername = [regex]::Match($credentialText, '(?m)^Usuario:\s*(.+)$').Groups[1].Value.Trim()
$adminPassword = [regex]::Match($credentialText, '(?m)^Contraseña:\s*(.+)$').Groups[1].Value.Trim()
if (!$adminUsername -or !$adminPassword) { throw 'Provide a private credentials file with Usuario and Contraseña fields.' }
$adminSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$testSuffix = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$readerUsername = "codex_reader_$testSuffix"
$editorUsername = "codex_admin_$testSuffix"
$testPassword = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
$replacementPassword = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
$created = [System.Collections.Generic.List[string]]::new()
$checks = 0

function ApiRequest([string]$Action, [string]$Username, [string]$Password, $Session, $Body = $null, [string]$Token = '') {
    $headers = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${Username}:$Password")) }
    if ($Token) { $headers['X-CSRF-Token'] = $Token }
    $parameters = @{ Uri = "$BaseUri/api.php?action=$Action"; Headers = $headers; WebSession = $Session; SkipHttpErrorCheck = $true }
    if ($null -ne $Body) { $parameters.Method = 'POST'; $parameters.ContentType = 'application/json'; $parameters.Body = ($Body | ConvertTo-Json -Compress) }
    return Invoke-WebRequest @parameters
}
function CheckStatus($Response, [int]$Expected, [string]$Label) {
    if ([int]$Response.StatusCode -ne $Expected) { throw "$Label returned $($Response.StatusCode); expected $Expected." }
    $script:checks++
}
try {
    $treeResponse = ApiRequest 'get_tree' $adminUsername $adminPassword $adminSession
    CheckStatus $treeResponse 200 'Administrator tree'
    $tree = $treeResponse.Content | ConvertFrom-Json
    if (!$tree.can_edit -or !$tree.can_manage_users) { throw 'Administrator permissions missing.' }
    $token = $tree.csrf_token
    $body = @{ username = $readerUsername; role = 'reader'; password = $testPassword; create = $true }
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession $body) 403 'Missing CSRF'
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession $body 'wrong-token') 403 'Invalid CSRF'
    $created.Add($readerUsername)
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession $body $token) 200 'Create reader'
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession $body $token) 409 'Duplicate reader'
    $readerSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $readerTreeResponse = ApiRequest 'get_tree' $readerUsername $testPassword $readerSession
    CheckStatus $readerTreeResponse 200 'Apache authenticates PHP bcrypt'
    $readerTree = $readerTreeResponse.Content | ConvertFrom-Json
    if ($readerTree.can_edit -or $readerTree.can_manage_users) { throw 'Reader was given administrator access.' }
    CheckStatus (ApiRequest 'list_users' $readerUsername $testPassword $readerSession) 403 'Reader cannot list accounts'
    CheckStatus (ApiRequest 'save_user' $readerUsername $testPassword $readerSession @{ username = $readerUsername; role = 'admin'; password = ''; create = $false } $readerTree.csrf_token) 403 'Reader cannot promote self'
    CheckStatus (ApiRequest 'update_person' $readerUsername $testPassword $readerSession @{ person_id = 1 } $readerTree.csrf_token) 403 'Reader cannot edit family'
    $created.Add($editorUsername)
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession @{ username = $editorUsername; role = 'admin'; password = $testPassword; create = $true } $token) 200 'Create administrator'
    $editorSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $editorTreeResponse = ApiRequest 'get_tree' $editorUsername $testPassword $editorSession
    CheckStatus $editorTreeResponse 200 'New administrator login'
    $editorTree = $editorTreeResponse.Content | ConvertFrom-Json
    if (!$editorTree.can_edit -or !$editorTree.can_manage_users) { throw 'New administrator role needs an unexpected restart.' }
    CheckStatus (ApiRequest 'list_users' $editorUsername $testPassword $editorSession) 200 'New administrator lists accounts'
    CheckStatus (ApiRequest 'delete_user' $adminUsername $adminPassword $adminSession @{ username = $adminUsername } $token) 409 'Self deletion prevented'
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession @{ username = $adminUsername; role = 'reader'; password = ''; create = $false } $token) 409 'Self demotion prevented'
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession @{ username = $editorUsername; role = 'reader'; password = ''; create = $false } $token) 200 'Demote test administrator'
    $demotedResponse = ApiRequest 'get_tree' $editorUsername $testPassword $editorSession
    CheckStatus $demotedResponse 200 'Demoted user keeps read access'
    if (($demotedResponse.Content | ConvertFrom-Json).can_manage_users) { throw 'Demoted account still manages users.' }
    CheckStatus (ApiRequest 'list_users' $editorUsername $testPassword $editorSession) 403 'Demotion applies without restart'
    CheckStatus (ApiRequest 'save_user' $adminUsername $adminPassword $adminSession @{ username = $readerUsername; role = 'reader'; password = $replacementPassword; create = $false } $token) 200 'Reset reader password'
    CheckStatus (ApiRequest 'get_tree' $readerUsername $testPassword $readerSession) 401 'Old password rejected by Apache'
    CheckStatus (ApiRequest 'get_tree' $readerUsername $replacementPassword $readerSession) 200 'New password accepted by Apache'
    $listResponse = ApiRequest 'list_users' $adminUsername $adminPassword $adminSession
    CheckStatus $listResponse 200 'List accounts'
    foreach ($account in ($listResponse.Content | ConvertFrom-Json).users) {
        if (@($account.PSObject.Properties.Name | Where-Object { $_ -notin @('username', 'role') }).Count) { throw 'Account response exposes unexpected fields.' }
    }
    $after = (ApiRequest 'get_tree' $adminUsername $adminPassword $adminSession).Content | ConvertFrom-Json
    if ($after.people.Count -ne $tree.people.Count) { throw 'Account operations changed family records.' }
} finally {
    foreach ($name in $created) {
        $cleanup = ApiRequest 'delete_user' $adminUsername $adminPassword $adminSession @{ username = $name } $token
        if ([int]$cleanup.StatusCode -notin @(200, 404)) { throw "Could not remove test account $name." }
        CheckStatus (ApiRequest 'get_tree' $name $replacementPassword ([Microsoft.PowerShell.Commands.WebRequestSession]::new())) 401 'Deleted account cannot authenticate'
    }
}
"User API: $checks checks passed; temporary accounts removed."
