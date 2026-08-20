import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { VmConfig } from "../types";
import { createVmProgram } from "../pulumi-program";
import { proxmoxClient } from "../proxmox-api";
import { broadcastLog, createLogStreamHandler } from "./log-stream.service";

export async function resolveDatastoreForNode(nodeName: string, preferredDatastore?: string): Promise<string> {
    try {
        const storages = await proxmoxClient.getNodeStorages(nodeName);
        if (!storages || storages.length === 0) return "local-lvm";

        // Lọc bỏ hoàn toàn 'local' vì 'local' chỉ dùng cho ISO/Template/Backup
        const valid = storages.filter((s: any) => s.active !== 0 && s.storage !== "local");
        if (valid.length === 0) return "local-lvm";

        // Nếu người dùng chọn storage cụ thể (và khác local) tồn tại trên node này
        if (preferredDatastore && preferredDatastore !== "local" && valid.some((s: any) => s.storage === preferredDatastore)) {
            return preferredDatastore;
        }

        // Tự động tìm storage hợp lệ cho VM Disk trên node này (ưu tiên zfs-storage, zfs, local-lvm)
        const match = valid.find((s: any) => s.storage === "zfs-storage") ||
                      valid.find((s: any) => s.storage === "zfs") ||
                      valid.find((s: any) => s.storage.includes("zfs")) ||
                      valid.find((s: any) => s.storage.includes("lvm")) ||
                      valid[0];

        return match ? match.storage : "local-lvm";
    } catch {
        return preferredDatastore && preferredDatastore !== "local" ? preferredDatastore : "local-lvm";
    }
}

export async function executeVmDeployment(vms: VmConfig[], executor: { username: string; role: string }) {
    const isBatch = vms.length > 1;
    const stackNames = vms.map(v => `vm-${v.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")}`);

    if (isBatch) {
        broadcastLog(`\n[CLUSTER] [User: ${executor.username} (${executor.role.toUpperCase()})] Initiating cluster provisioning of ${vms.length} VMs: ${vms.map(v => `${v.name} (@${v.nodeName})`).join(", ")}...`);
    } else {
        broadcastLog(`\n[CREATE] [User: ${executor.username} (${executor.role.toUpperCase()})] Initiating stack '${stackNames[0]}' for VM ${vms[0].name}...`);
    }

    for (let i = 0; i < vms.length; i++) {
        const config = vms[i];
        const stackName = stackNames[i];
        const prefix = isBatch ? `[${i + 1}/${vms.length} - ${config.name}]` : `[${config.name}]`;

        // Tự động phân giải datastore phù hợp với từng Node
        config.datastoreId = await resolveDatastoreForNode(config.nodeName, config.datastoreId);

        broadcastLog(`\n[PULUMI] ${prefix} Provisioning stack '${stackName}' on Node '${config.nodeName}' (Storage: ${config.datastoreId})...`);

        try {
            const program = createVmProgram(config);
            const stack = await LocalWorkspace.createOrSelectStack({
                stackName,
                projectName: "pulumi-proxmox",
                program,
            });

            await stack.setConfig("proxmox:endpoint", { value: process.env.PROXMOX_VE_ENDPOINT || "" });
            await stack.setConfig("proxmox:apiToken", { value: process.env.PROXMOX_VE_API_TOKEN || "", secret: true });
            await stack.setConfig("proxmox:insecure", { value: process.env.PROXMOX_VE_INSECURE || "true" });

            const logHandler = createLogStreamHandler("Updating");

            const upResult = await stack.up({
                onOutput: logHandler,
            });

            broadcastLog(`PROGRESS_END:Updating`);
            broadcastLog(`✅ ${prefix} Deployed successfully! VM ID: ${upResult.outputs.vmId?.value || 'N/A'}`);
        } catch (err: any) {
            broadcastLog(`PROGRESS_END:Updating`);
            broadcastLog(`❌ [ERROR] ${prefix} Failed: ${err.message}`);
        }
    }
}
