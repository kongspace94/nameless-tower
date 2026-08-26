/* 이름 없는 탑 — 개발용 정적 서버 (무의존성)
 * index.html + js/ + assets/ 를 그대로 서빙 → 빌드 없이 새로고침만으로 테스트.
 * (build.js로 만드는 text-rpg-standalone.html은 '배포용 단일 파일'일 뿐, 개발엔 불필요)
 * 실행: node dev-server.js   →   http://localhost:5173
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 5173;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json",
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    // 경로 이탈 방지
    const safe = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(ROOT, safe);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404: " + urlPath);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",   // 항상 최신(개발용)
      });
      res.end(data);
    });
  } catch (e) {
    res.writeHead(500); res.end("500");
  }
});

server.listen(PORT, () => {
  console.log(`▶ 이름 없는 탑 dev 서버: http://localhost:${PORT}`);
  console.log(`   (js/ 나 index.html 수정 후 브라우저 새로고침 → 즉시 반영, 빌드 불필요)`);
});
