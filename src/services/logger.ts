import {DiscordAPIError} from 'discord.js';
import {Response} from 'node-fetch';
import pino from 'pino';
import dotenv from "dotenv";

dotenv.config();

// Detect environment
const isProduction = process.env.NODE_ENV === "production";
const logsDir = process.env.LOGS_DIR || "./var/log";

const transportProd = pino.transport({
    target: 'pino/file',
    options: {
        destination: logsDir + "/gandhi-prod_" + Date.now() + ".log",
        mkdir: true
    }
});

const transportDev = pino.transport({
    target: "pino-pretty",
    options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o",
    },
});

let logger = pino({
    level: isProduction ? "info" : "debug", // More verbose in dev, minimal in prod
    formatters: {
        level: (label) => ({ level: label }),
    },
}, isProduction ? transportProd : transportDev);

export class Logger {
    private static shardId: number;

    public static debug(message: string, obj?: unknown): void {
        if (obj) {
            logger.debug(obj, message);
        } else {
            logger.debug(message);
        }
    }

    public static info(message: string, obj?: unknown): void {
        if (obj) {
            logger.info(obj, message);
        } else {
            logger.info(message);
        }
    }

    public static warn(message: string, obj?: unknown): void {
        if (obj) {
            logger.warn(obj, message);
        } else {
            logger.warn(message);
        }
    }

    public static async error(message: string, obj?: unknown): Promise<void> {
        // Log just a message if no error object
        if (!obj) {
            logger.error(message);
            return;
        }

        // Otherwise log details about the error
        if (typeof obj === 'string') {
            logger
                .child({
                    message: obj,
                })
                .error(message);
        } else if (obj instanceof Response) {
            let resText: string = '';
            try {
                resText = await obj.text();
            } catch {
                // Ignore
            }
            logger
                .child({
                    path: obj.url,
                    statusCode: obj.status,
                    statusName: obj.statusText,
                    headers: obj.headers.raw(),
                    body: resText,
                })
                .error(message);
        } else if (obj instanceof DiscordAPIError) {
            logger
                .child({
                    message: obj.message,
                    code: obj.code,
                    statusCode: obj.status,
                    method: obj.method,
                    url: obj.url,
                    stack: obj.stack,
                })
                .error(message);
        } else {
            logger.error(obj, message);
        }
    }

    public static setShardId(shardId: number): void {
        if (this.shardId !== shardId) {
            this.shardId = shardId;
            logger = logger.child({shardId});
        }
    }
}