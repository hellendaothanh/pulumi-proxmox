type LogListener = (data: string) => void;
export const logListeners = new Set<LogListener>();

export function broadcastLog(message: string): void {
    for (const listener of logListeners) {
        try {
            listener(message);
        } catch {
            // ignore listener errors
        }
    }
}

export function createLogStreamHandler(actionLabel: string = "Executing") {
    let lastProgressTime = 0;
    broadcastLog(`PROGRESS_START:${actionLabel}`);

    return (msg: string) => {
        const cleanMsg = msg.replace(/\r?\n$/, "");
        if (!cleanMsg) return;

        const now = Date.now();
        if (now - lastProgressTime > 1500) {
            broadcastLog(`PROGRESS_TICK:${actionLabel}`);
            lastProgressTime = now;
        }

        broadcastLog(cleanMsg);
    };
}
