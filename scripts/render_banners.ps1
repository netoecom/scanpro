$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$banners = @("banner_1", "banner_2", "banner_3", "banner_4", "banner_5")

for ($i = 0; $i -lt $banners.Count; $i++) {
    $num = $i + 1
    $bName = $banners[$i]
    $htmlPath = "file:///d:/PROJETO SCAN PRO/scripts/$bName.html"
    $outPath = "d:\PROJETO SCAN PRO\assets\store\playstore_screen_$num.png"
    
    if (Test-Path "d:\PROJETO SCAN PRO\scripts\$bName.html") {
        Write-Host "Renderizando $bName -> $outPath"
        & $edge --headless=old --disable-gpu --screenshot="$outPath" --window-size=1080,1920 --hide-scrollbars "$htmlPath"
        Start-Sleep -Seconds 1
        if (Test-Path $outPath) {
            $f = Get-Item $outPath
            Write-Host "Sucesso: $($f.Name) ($($f.Length) bytes)"
        } else {
            Write-Warning "Falha ao gerar $outPath"
        }
    } else {
        Write-Host "Arquivo scripts/$bName.html ainda nao existe. Pulando..."
    }
}
