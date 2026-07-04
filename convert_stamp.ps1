$bytes = [System.IO.File]::ReadAllBytes("src\assets\stamp.png")
$b64 = [System.Convert]::ToBase64String($bytes)
$content = "export const ECS_STAMP_BASE64 = `"data:image/png;base64,$b64`";"
[System.IO.File]::WriteAllText("src\assets\stampBase64.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "Done. Base64 length: $($b64.Length)"
