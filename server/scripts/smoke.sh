#!/usr/bin/env bash
# Plays one order through from both sides against a running server, with curl:
# a customer orders and pays, the seller accepts, walks it over and delivers it. Then a second
# order is declined. With --with-expiry, a third waits 5 minutes and expires.
#
#   npm run dev -w @shoot/server          (in another terminal, with fresh data)
#   bash server/scripts/smoke.sh [--with-expiry] [http://localhost:4000]
set -euo pipefail

WITH_EXPIRY=false
BASE=http://localhost:4000
for arg in "$@"; do
  case $arg in
    --with-expiry) WITH_EXPIRY=true ;;
    *) BASE=$arg ;;
  esac
done

# post PATH TOKEN [JSON] prints the response body; fails on an HTTP error.
post() {
  curl -sf -X POST "$BASE$1" -H "Authorization: Bearer $2" -H 'Content-Type: application/json' -d "${3:-{\}}"
}
field() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(eval('JSON.parse(s).'+process.argv[1])))" "$1"; }
step() { printf '%-34s %s\n' "$1" "$2"; }

ORDER='{"cafeId":"saaripaahtimo","lines":[{"itemId":"saari-cappuccino","quantity":2}],"note":"smoke test","coordinates":{"latitude":60.45,"longitude":22.27},"delivery":{"kind":"spot","spotCode":"shoot-spot:saari-table-4"},"payment":{"methodId":"wallet","label":"Apple Pay"}}'

curl -sf "$BASE/cafes?latitude=60.45&longitude=22.27" > /dev/null
curl -sf -X POST "$BASE/auth/code" -H 'Content-Type: application/json' -d '{"phone":"+358401234567"}'
CUSTOMER=$(curl -sf -X POST "$BASE/auth/verify" -H 'Content-Type: application/json' \
  -d '{"phone":"+358401234567","code":"123456"}' | field token)
SELLER=$(curl -sf -X POST "$BASE/seller/auth/sign-in" -H 'Content-Type: application/json' \
  -d '{"email":"seller@shoot.com","password":"1234"}' | field token)

place() {
  local id
  id=$(post /orders "$CUSTOMER" "$ORDER" | field order.id)
  post "/orders/$id/confirm" "$CUSTOMER" > /dev/null
  echo "$id"
}

ID=$(place)
step "customer paid" "$(curl -sf "$BASE/orders/$ID" -H "Authorization: Bearer $CUSTOMER" | field status)"
step "seller accepts" "$(post "/seller/orders/$ID/accept" "$SELLER" | field status)"
step "seller is on the way" "$(post "/seller/orders/$ID/on-my-way" "$SELLER" | field status)"
step "seller delivered" "$(post "/seller/orders/$ID/delivered" "$SELLER" | field status)"

ID=$(place)
step "second order declined (sold out)" "$(post "/seller/orders/$ID/decline" "$SELLER" '{"reason":"sold-out"}' | field status)"

if $WITH_EXPIRY; then
  ID=$(place)
  echo "third order waits 5 minutes and 20 seconds…"
  sleep 320
  step "third order, never accepted" "$(curl -sf "$BASE/orders/$ID" -H "Authorization: Bearer $CUSTOMER" | field status)"
fi
