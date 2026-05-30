$ErrorActionPreference = 'Stop'

$sourceUrl = 'https://docs.daz3d.com/public/software/dazstudio/4/referenceguide/interface/action/index/start'
$outputPath = Join-Path $PSScriptRoot '..\docs\daz-action-index.json'
$html = (Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing).Content
$matches = [regex]::Matches(
  $html,
  '<a\s+href="(?<href>/public/software/dazstudio/4/referenceguide/interface/action/index/[^"#?]+/start)"[^>]*>(?<title>.*?)</a>',
  'IgnoreCase'
)

$baseUri = [System.Uri]'https://docs.daz3d.com'
$seen = [System.Collections.Generic.HashSet[string]]::new()
$actions = foreach ($match in $matches) {
  $url = [System.Uri]::new($baseUri, $match.Groups['href'].Value).AbsoluteUri
  if ($url -eq $sourceUrl) {
    continue
  }

  $title = [System.Net.WebUtility]::HtmlDecode(
    ($match.Groups['title'].Value -replace '<[^>]+>', '' -replace '\s+', ' ').Trim()
  )
  if ($title.Length -eq 0) {
    continue
  }

  if ($seen.Add($url)) {
    [pscustomobject]@{
      title = $title
      url = $url
    }
  }
}

$result = [pscustomobject]@{
  source = [pscustomobject]@{
    title = 'DAZ Studio 4.x Action Index'
    url = $sourceUrl
  }
  actions = @($actions)
}

$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $outputPath -Encoding UTF8
Write-Output "Wrote $($actions.Count) actions to $outputPath"
