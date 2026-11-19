# Starts the original OpenAI demo backend (Python, FastAPI) on 127.0.0.1:8000.
# Run it through the password broker so OPENAI_API_KEY never lands in a file:
#   pwsh -NoProfile -File <broker.ps1> inject openai-api-key -EnvName OPENAI_API_KEY :: pwsh -NoProfile -File scripts/start-python-backend.ps1
$backend = Join-Path $PSScriptRoot "..\examples\openai-cs-agents-demo\python-backend"
Set-Location $backend
# The demo disables tracing by default; we turn it on to see runs at platform.openai.com/traces.
$env:OPENAI_TRACING_DISABLED = "0"
& .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
