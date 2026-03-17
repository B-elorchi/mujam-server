# PowerShell script to generate audio for all sentences in all levels
# Usage: .\scripts\generate-all-audio.ps1 -Token "your_jwt_token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$API_BASE = "http://localhost:4000/api"
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "`n🌱 Starting bulk audio generation for all levels...`n" -ForegroundColor Green
Write-Host "⏳ This will take approximately 10-15 minutes for 180 sentences`n" -ForegroundColor Yellow

$results = @()

for ($levelId = 1; $levelId -le 7; $levelId++) {
    Write-Host "`n🎵 Generating audio for Level $levelId..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/admin/levels/$levelId/sentences/bulk-generate-audio" `
                                       -Method Post `
                                       -Headers $headers `
                                       -TimeoutSec 300
        
        Write-Host "✅ Level $levelId complete: $($response.message)" -ForegroundColor Green
        $results += @{ levelId = $levelId; success = $true; message = $response.message }
        
        if ($levelId -lt 7) {
            Write-Host "⏸️  Waiting 2 seconds before next level..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    catch {
        Write-Host "❌ Level $levelId failed: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{ levelId = $levelId; success = $false; error = $_.Exception.Message }
    }
}

Write-Host "`n`n📊 Summary:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Gray

$totalSuccess = ($results | Where-Object { $_.success -eq $true }).Count
$totalFailed = ($results | Where-Object { $_.success -eq $false }).Count

foreach ($result in $results) {
    if ($result.success) {
        Write-Host "✅ Level $($result.levelId): $($result.message)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Level $($result.levelId): Failed" -ForegroundColor Red
    }
}

Write-Host "`n═══════════════════════════════════════" -ForegroundColor Gray
Write-Host "Total: $totalSuccess succeeded, $totalFailed failed" -ForegroundColor White

if ($totalFailed -eq 0) {
    Write-Host "`n🎉 All audio files generated successfully!" -ForegroundColor Green
}
else {
    Write-Host "`n⚠️  Some levels failed. Check the errors above." -ForegroundColor Yellow
}
