<#
  Registers the daily agent loop with Windows Task Scheduler (weekdays, current user).

    powershell -ExecutionPolicy Bypass -File agents\install-schedule.ps1
    powershell -ExecutionPolicy Bypass -File agents\install-schedule.ps1 -Briefing 07:40 -WorkStart 09:00 -WorkHours 6 -EveryMinutes 90 -Wrapup 15:30
    powershell -ExecutionPolicy Bypass -File agents\install-schedule.ps1 -Remove

  Run it from the agent clone. Tasks run only while you're logged in, because the claude / gh / ollama
  logins live in your user profile. The dispatcher's own workWindow in config.json is the final say on hours.
#>
param(
  [string]$Briefing = "07:40",
  [string]$WorkStart = "09:00",
  [int]$WorkHours = 6,
  [int]$EveryMinutes = 90,
  [string]$Wrapup = "15:30",
  [switch]$Remove
)

$ErrorActionPreference = "Stop"
$Folder = "\Intrepid Agents\"
$Repo = Split-Path -Parent $PSScriptRoot
$Days = "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"

if ($Remove) {
  Get-ScheduledTask -TaskPath $Folder -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
  Write-Host "Removed tasks under $Folder"
  return
}

$Node = (Get-Command node -ErrorAction Stop).Source
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3)

function Register-AgentTask([string]$Name, [string]$Mode, $Trigger) {
  $Action = New-ScheduledTaskAction -Execute $Node -Argument "agents\dispatch.mjs $Mode" -WorkingDirectory $Repo
  Register-ScheduledTask -TaskPath $Folder -TaskName $Name -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
  Write-Host "Registered $Folder$Name"
}

Register-AgentTask "Briefing" "briefing" (New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $Briefing)

$Work = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $WorkStart
$Work.Repetition = (New-ScheduledTaskTrigger -Once -At $WorkStart `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Hours $WorkHours)).Repetition
Register-AgentTask "Work" "work" $Work

Register-AgentTask "Wrapup" "wrapup" (New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $Wrapup)

Write-Host ""
Write-Host "Done. Check them in Task Scheduler under 'Intrepid Agents', or run one now:"
Write-Host "  Start-ScheduledTask -TaskPath '$Folder' -TaskName Briefing"
Write-Host "Logs: agents\.state\run-YYYY-MM-DD.log"
