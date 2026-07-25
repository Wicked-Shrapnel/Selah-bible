param(
  [string]$Book = "Genesis",
  [int]$Chapter = 1,
  [string]$Voice = "Microsoft David Desktop",
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

function Get-BookSlug {
  param([string]$Name)
  return ($Name.ToLower() -replace '[^a-z0-9]+', '-' -replace '^-+|-+$', '')
}

function Write-WaveFile {
  param(
    [System.Speech.Synthesis.SpeechSynthesizer]$Synth,
    [string]$Text,
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  if (Test-Path $Path) {
    if (-not $Rebuild) { return }
    Remove-Item $Path -Force
  }

  $Synth.SetOutputToWaveFile($Path)
  $Synth.Speak($Text)
  $Synth.SetOutputToDefaultAudioDevice()
}

$baseDir = Join-Path $PSScriptRoot "..\public\audio"
$bibleDir = Join-Path $PSScriptRoot "..\public\bible\kjv"
$bookSlug = Get-BookSlug -Name $Book
$chapterDir = Join-Path $baseDir (Join-Path $bookSlug $Chapter)
$chapterKey = "$bookSlug-$Chapter"

$biblePath = Join-Path $bibleDir (($Book -replace '\s+', '') + ".json")
if (-not (Test-Path $biblePath)) {
  throw "Bible file not found at $biblePath."
}

$response = Get-Content -Raw -Path $biblePath | ConvertFrom-Json
$chapterData = $response.chapters | Where-Object { [int]$_.chapter -eq $Chapter } | Select-Object -First 1

if (-not $chapterData.verses) {
  throw "No verses returned for $Book $Chapter."
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$installed = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq $Voice } | Select-Object -First 1
if ($installed) {
  $synth.SelectVoice($installed.VoiceInfo.Name)
}

Write-WaveFile -Synth $synth -Text "$Book chapter $Chapter." -Path (Join-Path $chapterDir "intro.wav")

foreach ($verse in $chapterData.verses) {
  $path = Join-Path $chapterDir ("{0}.wav" -f $verse.verse)
  Write-WaveFile -Synth $synth -Text ($verse.text.Trim()) -Path $path
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

Write-Host "Saved audio for $Book $Chapter at $chapterDir"
