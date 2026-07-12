// Public surface of @gandhi/core — the pure domain layer shared between the
// Discord bot and the web service. It carries no runtime coupling to discord.js,
// the logger, or the database connection, so any consumer can interpret rows and
// compute stats without pulling in the bot.
//
// Fine-grained subpath imports (e.g. `@gandhi/core/models/database/user_stats`)
// are also exposed via the package "exports" map; this barrel is a convenience
// re-export. The three model modules each declare their own `StatKey` type, so
// they are re-exported here under distinct aliases to avoid a name collision.

export * from './types/db';
export * from './utils/time';
export * from './utils/number';
export * from './utils/database';

export {
    UserStatsModel,
    UserStatsFields,
    StatTimeRelated,
    StatMaxRelated,
    StatCountRelated,
    type StatKey as UserStatKey,
} from './models/database/user_stats';

export {
    StartTimestampsModel,
    StartTsFields,
    type StatKey as StartStatKey,
} from './models/database/start_timestamps';

export {
    DailyStatsModel,
    DailyStatsFields,
    type DailyStatsMap,
    type StatKey as DailyStatKey,
} from './models/database/daily_stats';
