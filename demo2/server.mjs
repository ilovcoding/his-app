import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const store = createStore(
    process.env.HIS_DB_PATH || path.join(root, "data/his.sqlite"),
);
const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 3101);
const vite = dev
    ? await (
          await import("vite")
      ).createServer({
          configFile: path.join(root, "vite.config.js"),
          server: { middlewareMode: true },
          appType: "spa",
      })
    : null;
const json = (res, status, data) => {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
};
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
        if (url.pathname === "/api/health") {
            json(res, 200, { ok: true, storage: "SQLite" });
            return;
        }
        if (url.pathname === "/api/state" && req.method === "GET") {
            json(res, 200, store.snapshot());
            return;
        }
        if (url.pathname.startsWith("/api/actions/") && req.method === "POST") {
            if (
                req.headers.origin &&
                new URL(req.headers.origin).host !== req.headers.host
            ) {
                json(res, 403, { error: "不允许跨站写入" });
                return;
            }
            let raw = "";
            for await (const chunk of req) {
                raw += chunk;
                if (raw.length > 100000) {
                    json(res, 413, { error: "请求内容过大" });
                    return;
                }
            }
            let payload;
            try {
                payload = JSON.parse(raw || "{}");
            } catch {
                json(res, 400, { error: "请求格式无效" });
                return;
            }
            if (
                !payload ||
                typeof payload !== "object" ||
                Array.isArray(payload)
            ) {
                json(res, 400, { error: "请求格式无效" });
                return;
            }
            const result = store.mutate(
                url.pathname.slice("/api/actions/".length),
                payload,
            );
            json(res, 200, { ok: true, ...result });
            return;
        }
        if (url.pathname.startsWith("/api/")) {
            json(res, 404, { error: "接口不存在" });
            return;
        }
        if (vite) {
            vite.middlewares(req, res);
            return;
        }
        const dist = path.join(root, "dist");
        const file = path.resolve(dist, "." + decodeURIComponent(url.pathname));
        if (!file.startsWith(dist + path.sep) && file !== dist) {
            res.writeHead(403);
            res.end();
            return;
        }
        let target = file;
        try {
            if (!(await stat(target)).isFile())
                target = path.join(dist, "index.html");
        } catch {
            target = path.join(dist, "index.html");
        }
        const types = {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".woff2": "font/woff2",
        };
        const content = await readFile(target);
        res.writeHead(200, {
            "Content-Type":
                types[path.extname(target)] || "application/octet-stream",
            "Cache-Control": target.endsWith(".html")
                ? "no-cache"
                : "public, max-age=3600",
        });
        res.end(content);
    } catch (error) {
        console.error(error.message);
        json(res, error.status || 500, {
            error: error.status
                ? error.message
                : "操作未完成，请检查服务日志后重试",
        });
    }
});
server.on("error", (e) => {
    console.error(
        e.code === "EADDRINUSE"
            ? `端口 ${port} 已被占用，可用 PORT=3102 npm run dev 更换端口。`
            : e.message,
    );
    process.exit(1);
});
server.listen(port, "127.0.0.1", () =>
    console.log(
        `\n  澄和医疗 · 本地演示系统\n  Local: http://localhost:${port}\n  SQLite: ${process.env.HIS_DB_PATH || "data/his.sqlite"}\n`,
    ),
);
async function shutdown() {
    server.close();
    if (vite) await vite.close();
    store.close();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
