# 실시간 거래소 가격 모니터

React + Vite 프론트엔드만 담긴 폴더입니다. 기존 백엔드는 그대로 둡니다.

## 정확한 폴더 위치

market-data-server/frontend/src/App.jsx
market-data-server/frontend/src/main.jsx
market-data-server/frontend/vite.config.js

## 교체 및 실행

1. 실행 중인 프론트 Vite를 Ctrl+C로 종료합니다.
2. 기존 `market-data-server/frontend` 폴더를 통째로 삭제하거나 백업합니다.
3. 이 압축파일을 프로젝트 루트의 상위 폴더에 압축 해제하거나 `frontend` 폴더를 직접 교체합니다.
4. `cd market-data-server/frontend`
5. `npm install`
6. `npm run dev -- --force`
7. `http://localhost:5173/` 접속합니다.

백엔드는 별도 터미널에서 포트 3002로 실행해야 가격이 보입니다. 백엔드가 꺼져도 프론트는 오류 문구와 빈 목록을 표시합니다.

## 데이터

- GET /prices : 1초마다 조회 (각 source별 symbol, price 렌더링)
- GET /api/markets : 사용 가능할 때 Biquote 활성 종목 확인
- GET /api/markets/events : 사용 가능할 때 목록 변경 SSE 이벤트 수신

Vite proxy가 localhost:3002로 API 요청을 전달하므로 CORS 변경은 필요하지 않습니다.
