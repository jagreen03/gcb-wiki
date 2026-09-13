<#
.SYNOPSIS
    Builds the GCB Wiki Viewer and deploys it to a dynamic IIS site root.
.DESCRIPTION
    Dynamically locates the viewer directory relative to this script, runs 'npm run build',
    queries IIS for the default website's physical path, and deploys the output
    into a sub-folder matching the specified Alias.
#>

param (
    [string]$ViewerDir = "",
    [string]$Alias = "coyote",
    [string]$CustomTargetDir = ""
)

$ErrorActionPreference = "Stop"

# If $ViewerDir is not explicitly provided, derive it relative to this script's location
if ([string]::IsNullOrWhiteSpace($ViewerDir)) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $ViewerDir = $ScriptDir
}

if (-not (Test-Path -Path $ViewerDir)) {
    throw "Viewer directory could not be found at: $ViewerDir"
}

# Determine target directory: if not explicitly overridden, query IIS for the Default Web Site root path
if ([string]::IsNullOrWhiteSpace($CustomTargetDir)) {
    Import-Module WebAdministration -ErrorAction SilentlyContinue

    $DefaultSitePath = $null
    if (Get-Module -ListAvailable -Name WebAdministration) {
        $DefaultSite = Get-WebSite | Where-Object { $_.name -eq "Default Web Site" -or $_.id -eq 1 } | Select-Object -First 1
        if ($DefaultSite) {
            $DefaultSitePath = (Get-WebConfigurationProperty -Filter "/system.applicationHost/sites/site[@name='$($DefaultSite.name)']/application[@path='/']/virtualDirectory[@path='/']" -Name physicalPath).Value
            # Expand environment variables like %SystemDrive% if present
            $DefaultSitePath = [System.Environment]::ExpandEnvironmentVariables($DefaultSitePath)
        }
    }

    if ([string]::IsNullOrWhiteSpace($DefaultSitePath)) {
        # Fallback if IIS module is missing or Default Site path cannot be read
        $DefaultSitePath = "C:\inetpub\wwwroot"
        Write-Warning "Could not dynamically read IIS Default Web Site root. Falling back to default: $DefaultSitePath"
    }

    $TargetDir = Join-Path $DefaultSitePath $Alias
} else {
    $TargetDir = $CustomTargetDir
}

Write-Host "Using viewer directory: $ViewerDir" -ForegroundColor Cyan
Set-Location -Path $ViewerDir

Write-Host "Building project (npm run build)..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path -Path $TargetDir)) {
    Write-Host "Creating target directory: $TargetDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

Write-Host "Copying build artifacts to $TargetDir..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination $TargetDir -Recurse -Force

Write-Host "Deployment complete. Live at: http://localhost/$Alias/" -ForegroundColor Green
