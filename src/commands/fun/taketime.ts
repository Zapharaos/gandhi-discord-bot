import {ChatInputCommandInteraction, PermissionsString, User} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {InteractionUtils} from "@utils/interaction";
import {Logger} from "@services/logger";
import lang from '../../../lang/lang.common.json';

function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// In-memory store for pending cards to reveal (keyed by userId)
type PendingTaketime = { messageId: string, cards: {color: string, value: number}[], timeoutId: NodeJS.Timeout };
const pendingTaketimeCards: { [userId: string]: PendingTaketime } = {};

// Clear pending cards after timeout
function clearPendingCards(userId: string): void {
    if (pendingTaketimeCards[userId]) {
        clearTimeout(pendingTaketimeCards[userId].timeoutId);
        delete pendingTaketimeCards[userId];
        Logger.debug(`Cleared pending cards for user ${userId} (timeout or new game)`);
    }
}

export class TaketimeCommand implements Command {
    public names = ['taketime'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        // Get user arguments
        const users: User[] = [];
        for (let i = 1; i <= 4; i++) {
            const user = intr.options.getUser(`user${i}`);
            if (user) users.push(user);
        }
        // Prevent duplicate users
        const userIds = users.map(u => u.id);
        const uniqueUserIds = new Set(userIds);
        if (uniqueUserIds.size !== userIds.length) {
            await InteractionUtils.send(intr, '❌ Each user must be unique. Please do not select the same user more than once.');
            return;
        }
        if (users.length < 2 || users.length > 4) {
            await InteractionUtils.send(intr, '❌ You must provide between 2 and 4 unique users.');
            return;
        }

        // Clear any previous pending cards for these users (new game)
        users.forEach(user => clearPendingCards(user.id));

        // Create and shuffle decks
        const whiteEmoji = lang.emojis.white || '◽';
        const blackEmoji = lang.emojis.black || '◾';
        const whiteDeck = Array.from({length: 12}, (_, i) => ({color: whiteEmoji, value: i + 1}));
        const blackDeck = Array.from({length: 12}, (_, i) => ({color: blackEmoji, value: i + 1}));
        const combined = shuffle([...whiteDeck, ...blackDeck]);
        const dealt = combined.slice(0, 12);

        // Deal cards
        const cardsPerPlayer = Math.floor(12 / users.length);
        const hands: { [userId: string]: {color: string, value: number}[] } = {};
        users.forEach((user, idx) => {
            hands[user.id] = dealt.slice(idx * cardsPerPlayer, (idx + 1) * cardsPerPlayer);
        });

        let failedDMs: string[] = [];
        if (users.length === 2) {
            // For 2 players: send 4 cards, store 2 for later
            for (const user of users) {
                const hand = hands[user.id];
                const first4 = hand.slice(0, 4);
                const last2 = hand.slice(4, 6);
                try {
                    const handMsg = `Your cards:\n` + first4.map(card => `- ${card.color} ${card.value}`).join('\n') + `\nReact with ▶️ to get your last 2 cards after playing 2.`;
                    const dmMsg = await user.send(handMsg);
                    await dmMsg.react('▶️');

                    // Set a 15-minute timeout to auto-clear pending cards
                    const timeoutId = setTimeout(() => {
                        Logger.debug(`Auto-clearing pending cards for user ${user.id} after 15 minutes`);
                        delete pendingTaketimeCards[user.id];
                    }, 15 * 60 * 1000); // 15 minutes in milliseconds

                    pendingTaketimeCards[user.id] = { messageId: dmMsg.id, cards: last2, timeoutId };
                    Logger.debug(`Stored pending cards for user ${user.id}, messageId: ${dmMsg.id}`);
                } catch (e) {
                    failedDMs.push(`<@${user.id}>`);
                }
            }
        } else {
            // For 3 or 4 players: send all cards
            for (const user of users) {
                try {
                    const hand = hands[user.id]
                        .map(card => `- ${card.color} ${card.value}`)
                        .join('\n');
                    await user.send(`Your cards:\n${hand}`);
                } catch (e) {
                    failedDMs.push(`<@${user.id}>`);
                }
            }
        }

        // Confirm in channel
        if (failedDMs.length > 0) {
            await InteractionUtils.send(intr, `Cards dealt! But I couldn't DM: ${failedDMs.join(', ')}. Make sure your DMs are open.`);
        } else {
            await InteractionUtils.send(intr, 'Cards dealt! Check your DMs.');
        }
    }
}

export { pendingTaketimeCards };
