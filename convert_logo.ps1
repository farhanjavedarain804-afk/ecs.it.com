$bytes = [System.IO.File]::ReadAllBytes("C:\Users\SAS\.gemini\antigravity\brain\8e61ef51-43b6-4ae8-a6d9-dc5812bb4103\media__1783172160377.png")
$b64 = [System.Convert]::ToBase64String($bytes)
$content = "export const ECS_LOGO_BASE64 = `"data:image/png;base64,$b64`";"
[System.IO.File]::WriteAllText("src\assets\logoBase64.ts", $content, [System.Text.Encoding]::UTF8)

# Also copy the raw PNG
Copy-Item "C:\Users\SAS\.gemini\antigravity\brain\8e61ef51-43b6-4ae8-a6d9-dc5812bb4103\media__1783172160377.png" "src\assets\logo.png" -Force

Write-Host "Done. Base64 length: $($b64.Length)"
