Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectDir = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectDir '.env'
if (Test-Path -LiteralPath $envPath) {
    Write-Output 'O arquivo .env já existe. Nenhuma credencial foi alterada.'
    exit 0
}

function New-RandomHex([int]$ByteCount) {
    $bytes = New-Object byte[] $ByteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    } finally {
        $generator.Dispose()
    }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

$templatePath = Join-Path $projectDir '.env.example'
$content = [System.IO.File]::ReadAllText($templatePath)
$content = $content -replace '(?m)^DB_PASSWORD=[^\r\n]*', ('DB_PASSWORD=' + (New-RandomHex 24))
$content = $content -replace '(?m)^DB_ROOT_PASSWORD=[^\r\n]*', ('DB_ROOT_PASSWORD=' + (New-RandomHex 32))
$content = $content -replace '(?m)^ADMIN_PASSWORD=[^\r\n]*', ('ADMIN_PASSWORD=' + (New-RandomHex 20))

$bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($content)
$stream = [System.IO.File]::Open($envPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
try {
    $stream.Write($bytes, 0, $bytes.Length)
} finally {
    $stream.Dispose()
}

Write-Output 'Arquivo .env criado com senhas aleatórias. Consulte ADMIN_LOGIN e ADMIN_PASSWORD nesse arquivo para entrar.'
