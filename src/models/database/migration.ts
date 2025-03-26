export type Migration = {
    id: number;
    name: string;
}

export type LocalMigration = {
    name: string;
    up: string[];
    down: string[];
}