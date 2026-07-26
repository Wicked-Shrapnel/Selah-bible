param(
  [Parameter(Mandatory = $true)]
  [string]$OldTestamentZip,

  [Parameter(Mandatory = $true)]
  [string]$NewTestamentZip,

  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$books = @(
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs",
  "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark",
  "Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians",
  "Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews",
  "James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
)

function Get-BookSlug {
  param([string]$Name)
  return ($Name.ToLower() -replace '[^a-z0-9]+', '-' -replace '^-+|-+$', '')
}

function Copy-ZipEntry {
  param(
    [System.IO.Compression.ZipArchiveEntry]$Entry,
    [string]$Destination
  )

  $directory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  if ((Test-Path -LiteralPath $Destination) -and -not $Rebuild) {
    return $false
  }

  $sourceStream = $Entry.Open()
  try {
    $targetStream = [System.IO.File]::Create($Destination)
    try {
      $sourceStream.CopyTo($targetStream)
    } finally {
      $targetStream.Dispose()
    }
  } finally {
    $sourceStream.Dispose()
  }

  return $true
}

function Import-TalkingBibleZip {
  param(
    [string]$ZipPath,
    [hashtable]$ChapterFiles
  )

  if (-not (Test-Path -LiteralPath $ZipPath)) {
    throw "Audio zip not found: $ZipPath"
  }

  $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    foreach ($entry in $zip.Entries) {
      if ($entry.FullName -notmatch '^(\d{2})_(.+?)(\d{3})?\.mp3$') { continue }

      $bookNumber = [int]$Matches[1]
      $chapterNumber = if ($Matches[3]) { [int]$Matches[3] } else { 1 }
      if ($bookNumber -lt 1 -or $bookNumber -gt $books.Count) { continue }

      $bookName = $books[$bookNumber - 1]
      $bookSlug = Get-BookSlug -Name $bookName
      $chapterKey = "$bookSlug-$chapterNumber"
      $relativeUrl = "/audio/$bookSlug/$chapterNumber.mp3"
      $destination = Join-Path $audioDir (Join-Path $bookSlug "$chapterNumber.mp3")

      Copy-ZipEntry -Entry $entry -Destination $destination | Out-Null
      $ChapterFiles[$chapterKey] = $relativeUrl
    }
  } finally {
    $zip.Dispose()
  }
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$audioDir = Join-Path $projectRoot "public\audio"
$manifestPath = Join-Path $audioDir "manifest.json"

if (-not (Test-Path -LiteralPath $audioDir)) {
  New-Item -ItemType Directory -Path $audioDir -Force | Out-Null
}

$chapterFiles = @{}

if (Test-Path -LiteralPath $manifestPath) {
  $existing = Get-Content -Raw -Path $manifestPath | ConvertFrom-Json
  if ($existing.chapterFiles) {
    foreach ($property in $existing.chapterFiles.PSObject.Properties) {
      $chapterFiles[$property.Name] = [string]$property.Value
    }
  }
}

Import-TalkingBibleZip -ZipPath $OldTestamentZip -ChapterFiles $chapterFiles
Import-TalkingBibleZip -ZipPath $NewTestamentZip -ChapterFiles $chapterFiles

$chapters = $chapterFiles.Keys | Sort-Object
$manifest = [ordered]@{
  format = "chapter-mp3"
  source = "Talking Bible KJV chapter MP3 import"
  chapters = $chapters
  chapterFiles = [ordered]@{}
}

foreach ($chapter in $chapters) {
  $manifest.chapterFiles[$chapter] = $chapterFiles[$chapter]
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding utf8

Write-Host "Imported $($chapters.Count) chapter MP3 files into $audioDir"
Write-Host "Manifest saved at $manifestPath"
