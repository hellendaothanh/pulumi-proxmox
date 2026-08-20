export const ROLE_QUOTAS = {
    developer: {
        maxVms: 2,           // Tối đa 2 VM chạy đồng thời
        maxCores: 4,         // Tối đa 4 vCPU tổng cộng
        maxMemoryMb: 8192,   // Tối đa 8GB RAM tổng cộng
        allowedEnvironments: ["dev"] // Chỉ được tự tạo trên DEV
    },
    viewer: {
        maxVms: 0,
        maxCores: 0,
        maxMemoryMb: 0,
        allowedEnvironments: []
    }
};
