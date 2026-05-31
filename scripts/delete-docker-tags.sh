#!/usr/bin/env bash
# 删除 Docker Hub agentai2027/openclaw-zh 的全部标签
# 需要: DOCKER_PASSWORD（用户 agentai2027）
set -uo pipefail

USER="${DOCKER_USER:-agentai2027}"
REPO="${DOCKER_REPO:-openclaw-zh}"
PASS="${DOCKER_PASSWORD:-}"

if [ -z "$PASS" ]; then
  echo "::error::请设置 DOCKER_PASSWORD"
  exit 1
fi

echo "[docker] 登录 Docker Hub..."
LOGIN_JSON=$(curl -sS -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
  https://hub.docker.com/v2/users/login/ || echo -e "\n000")
LOGIN_BODY=$(echo "$LOGIN_JSON" | sed '$d')
LOGIN_CODE=$(echo "$LOGIN_JSON" | tail -n1)

if [ "$LOGIN_CODE" != "200" ]; then
  echo "::warning::Docker Hub 登录失败 (HTTP $LOGIN_CODE)，跳过 Docker 标签删除"
  exit 0
fi

TOKEN=$(echo "$LOGIN_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token||'')}catch{console.log('')}})")

if [ -z "$TOKEN" ]; then
  echo "::warning::未获取到 Docker token，跳过 Docker 标签删除"
  exit 0
fi

PAGE=1
DELETED=0
while true; do
  RESP=$(curl -sS -w "\n%{http_code}" -H "Authorization: JWT $TOKEN" \
    "https://hub.docker.com/v2/repositories/${USER}/${REPO}/tags/?page_size=100&page=$PAGE" || echo -e '{"results":[]}\n404')
  BODY=$(echo "$RESP" | sed '$d')
  CODE=$(echo "$RESP" | tail -n1)

  if [ "$CODE" = "404" ]; then
    echo "[docker] 仓库 ${USER}/${REPO} 不存在或已无标签，跳过"
    break
  fi
  if [ "$CODE" != "200" ]; then
    echo "::warning::列出标签失败 (HTTP $CODE)，停止 Docker 删除"
    break
  fi

  COUNT=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log((JSON.parse(d).results||[]).length)}catch{console.log(0)}})")
  [ "$COUNT" = "0" ] && break

  echo "$BODY" | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        for (const t of JSON.parse(d).results||[]) console.log(t.name);
      } catch {}
    });
  " | while read -r TAG; do
    [ -z "$TAG" ] && continue
    echo "[docker] 删除标签: $TAG"
    DEL_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X DELETE -H "Authorization: JWT $TOKEN" \
      "https://hub.docker.com/v2/repositories/${USER}/${REPO}/tags/${TAG}/" || echo "000")
    if [ "$DEL_CODE" = "204" ] || [ "$DEL_CODE" = "200" ]; then
      DELETED=$((DELETED + 1))
    else
      echo "[docker] 跳过 $TAG (HTTP $DEL_CODE)"
    fi
  done

  PAGE=$((PAGE + 1))
done

echo "[docker] 完成（已删除 $DELETED 个标签）"
