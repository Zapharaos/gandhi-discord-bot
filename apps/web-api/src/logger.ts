import pino from 'pino';

// Standalone pino logger for the web service. Unlike the bot's logger it has no
// coupling to discord.js, so the web service can run without pulling the bot in.
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
    level: isProduction ? 'info' : 'debug',
    formatters: {
        level: (label) => ({ level: label }),
    },
    transport: isProduction
        ? undefined
        : {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  ignore: 'pid,hostname',
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
              },
          },
});
