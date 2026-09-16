#!/bin/bash
# vibe-code-workspace 단일 진입점 스크립트 (finllm backendctl 패턴)
# 사용: ./scripts/vibectl.sh <deploy|build|restart|status|logs|health>
set -euo pipefail
DIR=/home/ubuntu/vibe/vibe-code-workspace
SVC=vibe-code-workspace.service
PORT=3003

case "${1:-}" in
  build)
    cd "$DIR" && npm run build
    ;;
  restart)
    sudo systemctl restart "$SVC"
    sleep 3
    "$0" health
    ;;
  deploy)   # 빌드 + 재시작 + health — 코드 변경 후엔 반드시 deploy (restart만 하면 이전 빌드로 뜸)
    "$0" build
    "$0" restart
    ;;
  status)
    systemctl status "$SVC" --no-pager | head -8
    ;;
  logs)
    journalctl -u "$SVC" -n "${2:-50}" --no-pager
    ;;
  health)
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)
    echo "health: 127.0.0.1:$PORT -> $code"
    [ "$code" = "200" ] || [ "$code" = "307" ]
    ;;
  *)
    echo "usage: $0 <deploy|build|restart|status|logs|health>"; exit 1
    ;;
esac
