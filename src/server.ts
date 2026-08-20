import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// 1. Load environment variables from .env
const envPaths = [
    path.join(process.cwd(), ".env"),
    path.join(__dirname, "../.env"),
    path.join(__dirname, "../../.env")
];

for (const envPath of envPaths) {
    try {
        if (fs.existsSync(envPath)) {
            const parsed = dotenv.parse(fs.readFileSync(envPath, "utf-8"));
            Object.assign(process.env, parsed);
            break;
        }
    } catch {}
}

import { alertService } from "./alert-service";
import { broadcastLog } from "./services/log-stream.service";
import { recordAuditLog } from "./services/audit.service";

// Routers
import { authRouter } from "./routes/auth.routes";
import { auditRouter } from "./routes/audit.routes";
import { streamRouter } from "./routes/stream.routes";
import { resourcesRouter } from "./routes/resources.routes";
import { alertsRouter } from "./routes/alerts.routes";
import { approvalsRouter } from "./routes/approvals.routes";
import { vmsRouter } from "./routes/vms.routes";
import { lifecycleRouter } from "./routes/lifecycle.routes";
import { snapshotsRouter } from "./routes/snapshots.routes";
import { firewallRouter } from "./routes/firewall.routes";
import { hardwareRouter } from "./routes/hardware.routes";

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../public")));

// 3. Initialize Background Resource Alerting Engine
alertService.init(
    (logMsg) => broadcastLog(logMsg),
    (entry) => recordAuditLog(entry as any)
);

// 4. Mount API Routers
app.use("/api/auth", authRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/logs", streamRouter);
app.use("/api/resources", resourcesRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api", approvalsRouter);
app.use("/api/vms", vmsRouter);
app.use("/api", lifecycleRouter);
app.use("/api", snapshotsRouter);
app.use("/api", firewallRouter);
app.use("/api", hardwareRouter);

// 5. Start Web Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🌐 Proxmox VM Self-Service Portal is running at:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});

export default app;
