param(
  [string]$Book = "Genesis",
  [int]$Chapter = 1,
  [string]$Voice = "en-US-AvaNeural",
  [string]$OutputFormat = "riff-24khz-16bit-mono-pcm",
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

function Get-BookSlug {
  param([string]$Name)
  return ($Name.ToLower() -replace '[^a-z0-9]+', '-' -replace '^-+|-+$', '')
}

function Escape-Ssml {
  param([string]$Text)
  return [System.Security.SecurityElement]::Escape($Text)
}

function Write-AzureSpeechFile {
  param(
    [string]$Text,
    [string]$Path,
    [string]$VoiceName,
    [string]$Region,
    [string]$Key,
    [string]$Format
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  if ((Test-Path $Path) -and -not $Rebuild) {
    return
  }

  $ssmlText = Escape-Ssml -Text $Text
  $ssml = "<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' name='$VoiceName'>$ssmlText</voice></speak>"
  $uri = "https://$Region.tts.speech.microsoft.com/cognitiveservices/v1"

  Invoke-WebRequest `
    -Uri $uri `
    -Method Post `
    -Headers @{
      "Ocp-Apim-Subscription-Key" = $Key
      "X-Microsoft-OutputFormat" = $Format
      "User-Agent" = "SelahBibleAudioGenerator"
    } `
    -ContentType "application/ssml+xml" `
    -Body $ssml `
    -OutFile $Path | Out-Null
}

$speechKey = $env:AZURE_SPEECH_KEY
$speechRegion = $env:AZURE_SPEECH_REGION

if (-not $speechKey -or -not $speechRegion) {
  throw "Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION before running this script."
}

$baseDir = Join-Path $PSScriptRoot "..\public\audio"
$bibleDir = Join-Path $PSScriptRoot "..\public\bible\kjv"
$bookSlug = Get-BookSlug -Name $Book
$chapterDir = Join-Path $baseDir (Join-Path $bookSlug $Chapter)
$biblePath = Join-Path $bibleDir (($Book -replace '\s+', '') + ".json")

if (-not (Test-Path $biblePath)) {
  throw "Bible file not found at $biblePath."
}

$bookData = Get-Content -Raw -Path $biblePath | ConvertFrom-Json
$chapterData = $bookData.chapters | Where-Object { [int]$_.chapter -eq $Chapter } | Select-Object -First 1

if (-not $chapterData.verses) {
  throw "No verses found for $Book $Chapter."
}

Write-AzureSpeechFile `
  -Text "$Book chapter $Chapter." `
  -Path (Join-Path $chapterDir "intro.wav") `
  -VoiceName $Voice `
  -Region $speechRegion `
  -Key $speechKey `
  -Format $OutputFormat

foreach ($verse in $chapterData.verses) {
  $path = Join-Path $chapterDir ("{0}.wav" -f $verse.verse)
  Write-AzureSpeechFile `
    -Text ($verse.text.Trim()) `
    -Path $path `
    -VoiceName $Voice `
    -Region $speechRegion `
    -Key $speechKey `
    -Format $OutputFormat
}

$manifestPath = Join-Path $baseDir "manifest.json"
$chapters = @()
if (Test-Path $baseDir) {
  $chapters = Get-ChildItem -Path $baseDir -Recurse -Filter intro.wav | ForEach-Object {
    $chapterFolder = Split-Path $_.DirectoryName -Leaf
    $bookFolder = Split-Path (Split-Path $_.DirectoryName -Parent) -Leaf
    "$bookFolder-$chapterFolder"
  } | Sort-Object -Unique
}

@{ chapters = $chapters } | ConvertTo-Json -Depth 3 | Set-Content -Path $manifestPath -Encoding utf8

Write-Host "Saved Azure audio for $Book $Chapter with $Voice at $chapterDir"
