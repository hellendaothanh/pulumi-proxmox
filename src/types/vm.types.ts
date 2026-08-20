export interface SecondaryDiskConfig {
    storage?: string;
    datastoreId?: string;
    sizeGb: number;
    slot?: string;
    interface?: string;
    discard?: boolean | string;
    cache?: string;
    name?: string;
}

export interface VmConfig {
    name: string;
    nodeName: string;
    resourceType?: "qemu" | "lxc";
    description?: string;
    cores?: number;
    memoryMb?: number;
    diskSizeGb?: number;
    datastoreId?: string;
    diskImageId?: string;
    sshUser?: string;
    sshPublicKey?: string;
    password?: string;
    bridge?: string;
    vlanTag?: number;
    cpuType?: string;
    environment?: "dev" | "staging" | "prod" | "stag" | "pro" | string;
    tags?: string | string[];
    upgrade?: boolean;
    protection?: boolean;
    userData?: string;
    unprivileged?: boolean;
    appPreset?: string;
    secondaryDisks?: SecondaryDiskConfig[];
}

