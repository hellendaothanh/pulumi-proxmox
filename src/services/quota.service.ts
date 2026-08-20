import { proxmoxClient } from "../proxmox-api";

export async function calculateUserResourceUsage(username: string) {
    let currentVms = 0;
    let currentCores = 0;
    let currentMemoryMb = 0;

    try {
        const clusterOverview = await proxmoxClient.getClusterOverview();
        for (const node of clusterOverview) {
            for (const vm of node.vms || []) {
                const tags: string[] = Array.isArray(vm.tags) ? vm.tags : (typeof vm.tags === 'string' ? vm.tags.split(',') : []);
                const isOwner = tags.some((t: string) => t.toLowerCase() === `user:${username.toLowerCase()}`) ||
                                tags.some((t: string) => t.toLowerCase() === username.toLowerCase()) ||
                                (vm.name && vm.name.toLowerCase().startsWith(username.toLowerCase()));

                if (isOwner) {
                    currentVms += 1;
                    currentCores += Number(vm.cpus || vm.cores || 1);
                    currentMemoryMb += Number(vm.maxmem ? Math.round(vm.maxmem / (1024 * 1024)) : (vm.memory || 0));
                }
            }
        }
    } catch (e) {
        console.warn("[QUOTA] Unable to scan cluster resources for quota calculation:", e);
    }

    return {
        vms: currentVms,
        cores: currentCores,
        memoryMb: currentMemoryMb,
    };
}
