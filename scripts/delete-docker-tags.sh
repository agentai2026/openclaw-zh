#!/usr/bin/env bash
# 删除 Docker Hub agentai2027/openclaw-zh 的全部标签
# 需要: DOCKER_PASSWORD（用户 agentai2027）
set -euo pipefail

USER="${DOCKER_USER:-agentai2027}"
REPO="${DOCKER_REPO:-openclaw-zh}"
PASS="${DOCKER_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "[error] 请设置 DOCKER_PASSWORD"
  exit 1
fi

echo "[docker] 登录 Docker Hub..."
TOKEN=$(curl -fsSL -X POST -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
  https://hub.docker.com/v2/users/login/ | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

PAGE=1
while true; do
  RESP=$(curl -fsSL -H "Authorization: JWT $TOKEN" \
    "https://hub.docker.com/v2/repositories/${USER}/${REPO}/tags/?page_size=100&page=$PAGE")
  COUNT=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log((j.results||[]).length)})")
  [ "$COUNT" = "0" ] && break

  echo "$RESP" | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      for (const t of JSON.parse(d).results||[]) console.log(t.name);
    });
  " | while read -r TAG; do
    echo "[docker] 删除标签: $TAG"
    curl -fsSL -X DELETE -H "Authorization: JWT $TOKEN" \
      "https://hub.docker.com/v2/repositories/${USER}/${REPO}/tags/${TAG}/" || true
  done

  PAGE=$((PAGE + 1))
done

echo "[docker] 完成"
