set -euo pipefail
cd /c/dev/gm
mkdir -p .gm/tmp
REPORT=".gm/tmp/gmgc-parity-report.txt"
{
  echo "timestamp=$(date -Iseconds)"
  echo "pwd=$(pwd)"
  echo "section=versions"
  command -v bun || true
  bun --version || true
  command -v node || true
  node --version || true
  command -v npm || true
  npm --version || true
  echo "section=install-gmgc-latest"
  bun x gm-gc@latest install
  echo "section=locate-gemini"
  command -v gemini || true
  command -v gemini-cli || true
  echo "section=gemini-noninteractive-smoke"
  gemini -p "hello"
  echo "section=gmcc-reference-smoke"
  bun x gm-cc@latest install || true
  echo "section=done"
} > "$REPORT" 2>&1
