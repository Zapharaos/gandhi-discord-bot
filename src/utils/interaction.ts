import {BaseInteraction, ChatInputCommandInteraction, Guild, GuildMember} from "discord.js";

/**
 * Get the guild id from the interaction
 * @param interaction
 * @returns {string} The guild id
 */
export function getGuildId(interaction: BaseInteraction): string {
    return interaction.guild?.id ?? '';
}

/**
 * Get the target member from the interaction
 * @param interaction
 * @returns {GuildMember | null} The target member
 */
export function getTargetMember(interaction: ChatInputCommandInteraction): GuildMember | null{
    const target = interaction.options.getMember('target');
    return (target as GuildMember) ?? null;
}

export type InteractionUser = {
    id: string;
    name: string;
    avatar: string;
}

/**
 * Get the user from the interaction
 * @param interaction
 * @returns {InteractionUser} The user
 */
export function getInteractionUser(interaction: ChatInputCommandInteraction): InteractionUser {
    const target = getTargetMember(interaction);
    if (target) {
        return {
            id: target.user.id,
            name: target.displayName,
            avatar: target.displayAvatarURL()
        }
    }
    const member = interaction.member as GuildMember;
    return {
        id: interaction.user.id,
        name: member.displayName,
        avatar: member.displayAvatarURL()
    }
}

/**
 * Fetch the guild member nickname by id
 * @param guild
 * @param id
 * @returns {Promise<string | null>} The nickname or null
 */
export async function fetchGuildMemberNickname(guild: Guild, id: string): Promise<string | null> {
    try {
        const member = await guild.members.fetch(id);
        return member.displayName || member.nickname || member.user.globalName;
    } catch (error) {
        console.error(`Failed to fetch member with id ${id}:`, error);
        return null;
    }
}