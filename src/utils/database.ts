import { Generated } from "../types/db";

export class DatabaseUtils {
    static newGenerated<T>(value: T): Generated<T> {
        return value as unknown as Generated<T>;
    }

    static unwrapGeneratedNumber(value: Generated<number | null> | undefined): number {
        return value as unknown as number | 0;
    }
}