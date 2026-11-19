param(
  [string]$ContainerName = "nutrirag-pgvector",
  [string]$PostgresUser = "nutrirag_user",
  [string]$PostgresDb = "nutrirag_db",
  [string]$BackupDir = ".\backups",
  [int]$RetentionDays = 30
)

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$outFile = Join-Path $BackupDir "nutrirag_${PostgresDb}_${stamp}.dump"

Write-Host "[backup] Exportando base PostgreSQL desde $ContainerName -> $outFile"
docker exec $ContainerName pg_dump -U $PostgresUser -Fc -Z 9 $PostgresDb > $outFile
if ($LASTEXITCODE -ne 0) { throw "Fallo pg_dump en $ContainerName" }

$hash = (Get-FileHash -Algorithm SHA256 -Path $outFile).Hash
"$hash  $outFile" | Out-File -Encoding ascii "$outFile.sha256"

$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "*.dump*" | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force
Write-Host "[backup] Completado OK (SHA-256: $hash)"
