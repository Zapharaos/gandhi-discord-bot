import {StartTimestamps} from "@models/database/start_timestamps";

export class StartTimestampUtils {
    static isActive(startTimestamp?: StartTimestamps): boolean {
        return startTimestamp && startTimestamp.start_connected !== 0;
    }
}