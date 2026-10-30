# publish-article.ps1
# Post-generation script: updates sitemap.xml, ressources/index.html, and llms.txt
# Usage: .\publish-article.ps1 -Slug "calendrier-fiscal-congo-2027" -Title "Calendrier fiscal Congo 2027" -Eyebrow "Congo · Fiscalité" -Description "Toutes les échéances mois par mois"
param(
    [Parameter(Mandatory=$true)][string]$Slug,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Eyebrow,
    [Parameter(Mandatory=$true)][string]$Description,
    [string]$LlmsSection = "Ressources · Fiscalité au Congo",
    [string]$SiteRoot = "C:\Almathe\site-premium"
)

$date = Get-Date -Format "yyyy-MM-dd"
$url = "https://almathe.net/ressources/$Slug.html"

# 1. Update sitemap.xml
$sitemapPath = Join-Path $SiteRoot "sitemap.xml"
$sitemapEntry = @"

  <url>
    <loc>$url</loc>
    <lastmod>$date</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
"@
$sitemapContent = Get-Content $sitemapPath -Raw -Encoding utf8
if ($sitemapContent -notmatch [regex]::Escape($url)) {
    $sitemapContent = $sitemapContent -replace '</urlset>', "$sitemapEntry`n</urlset>"
    Set-Content $sitemapPath $sitemapContent -Encoding utf8 -NoNewline
    Write-Host "[OK] sitemap.xml updated with $url"
} else {
    Write-Host "[SKIP] $url already in sitemap.xml"
}

# 2. Update ressources/index.html - add card at top of grid
$indexPath = Join-Path $SiteRoot "ressources\index.html"
$cardHtml = @"

        <article class="card" data-reveal>
          <span class="eyebrow">$Eyebrow</span>
          <h3 style="margin-top:.5rem"><a href="$Slug.html">$Title</a></h3>
          <p>$Description</p>
          <p style="margin-top:1rem"><a class="btn btn-ghost" href="$Slug.html">Lire l'article &#x2192;</a></p>
        </article>
"@
$indexContent = Get-Content $indexPath -Raw -Encoding utf8
if ($indexContent -notmatch [regex]::Escape("$Slug.html")) {
    $indexContent = $indexContent -replace '(<div class="grid cards">)', "`$1`n$cardHtml"
    Set-Content $indexPath $indexContent -Encoding utf8 -NoNewline
    Write-Host "[OK] ressources/index.html updated"
} else {
    Write-Host "[SKIP] $Slug already in ressources/index.html"
}

# 3. Update llms.txt
$llmsPath = Join-Path $SiteRoot "llms.txt"
$llmsEntry = "- [$Title]($url)"
$llmsContent = Get-Content $llmsPath -Raw -Encoding utf8
if ($llmsContent -notmatch [regex]::Escape($url)) {
    $sectionPattern = "## $LlmsSection"
    if ($llmsContent -match [regex]::Escape($sectionPattern)) {
        $llmsContent = $llmsContent -replace ([regex]::Escape($sectionPattern)), "$sectionPattern`n$llmsEntry"
    } else {
        $llmsContent += "`n$llmsEntry"
    }
    Set-Content $llmsPath $llmsContent -Encoding utf8 -NoNewline
    Write-Host "[OK] llms.txt updated"
} else {
    Write-Host "[SKIP] $url already in llms.txt"
}

# 4. Update topics.json status
$topicsPath = Join-Path $SiteRoot "content-engine\topics.json"
$topicsContent = Get-Content $topicsPath -Raw -Encoding utf8
$topicsContent = $topicsContent -replace """slug"": ""$Slug""([\s\S]*?)""status"": ""pending""", """slug"": ""$Slug""`$1""status"": ""published"", ""publishedDate"": ""$date"""
Set-Content $topicsPath $topicsContent -Encoding utf8 -NoNewline
Write-Host "[OK] topics.json: $Slug marked as published"

Write-Host "`n[DONE] Article published: $url"
