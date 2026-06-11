$pagesDir = "C:\Users\Admin\Desktop\Calude Test\erp-app\client\src\pages"
$files = Get-ChildItem $pagesDir -Filter "*.tsx"

foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    $original = $content

    # Fix all template-literal links: to={`/path/`} to `/path/` (when no variable)
    $content = $content -replace "to=\{\x60(/[\w/-]+)\x60\}", 'to="/$1"'
    # Fix template-literal links with variables: to={`/path/${x.id}/edit`} to="/path/" + x.id + "/edit"
    $content = $content -replace "to=\{\x60(/[\w/-]+)\$\{(\w+)\.id\}\x60\}", 'to="/$1" + $2.id'

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $content, (New-Object System.Text.UTF8Encoding $true))
        Write-Host "Fixed: $($f.Name)"
    } else {
        Write-Host "OK:    $($f.Name)"
    }
}
