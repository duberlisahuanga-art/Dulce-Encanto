#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
nexus_root="${NEXUS_ENGINE_ROOT:-"$project_root/../../nexus-engine"}"
base_ref="${1:-codex/integracion}"
contract="${2:-.agent-task.yaml}"

if [[ ! -x "$nexus_root/.venv/bin/python" ]]; then
  echo "No se encontró el entorno virtual de Nexus en: $nexus_root" >&2
  exit 1
fi

if ! git -C "$project_root" rev-parse --verify "${base_ref}^{commit}" >/dev/null 2>&1; then
  echo "La rama o commit base no existe: $base_ref" >&2
  exit 1
fi

args=(
  "$nexus_root/main.py" validate
  --config "$nexus_root/config/dulce_encanto.yaml"
  --scope auto
  --base-ref "$base_ref"
  --json
)

if [[ -f "$project_root/$contract" ]]; then
  args+=(--task-contract "$contract")
else
  echo "Aviso: no se encontró $contract; Nexus validará sin contrato de tarea." >&2
fi

cd "$project_root"
exec "$nexus_root/.venv/bin/python" "${args[@]}"
