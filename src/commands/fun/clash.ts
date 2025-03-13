import {
    ChatInputCommandInteraction,
    SlashCommandBuilder
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('clash')
    .setDescription('Throws a diss at a user')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to diss')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('game')
            .setDescription('The game for which to generate a diss (CS or LoL)')
            .addChoices({ name: 'LoL', value: 'lol' }, { name: 'CSGO', value: 'csgo' })
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getMember('target');
    let game = interaction.options.getString('game');

    // Pick a random game if bad game is provided
    if (!game || !punchlines[game]) {
        game = Object.keys(punchlines)[Math.floor(Math.random() * Object.keys(punchlines).length)];
    }

    // Get the punchlines for the game
    const gamePunchlines = punchlines[game];

    const clash = gamePunchlines[Math.floor(Math.random() * gamePunchlines.length)];

    await interaction.reply(`${user} ${clash}`);
}

const punchlines: { [key: string]: string[] } = {
    'lol': [
        "You fed so much that the enemy support has more gold than our ADC...",
        "Your farm is a tribute to the missed CS of Bronze 4.",
        "I've seen bots play better than you… and they don’t even have a brain.",
        "You're the only person who can lose a 1v1 against a cannon minion.",
        "Even Yuumi carries more than you.",
        "You didn't see your jungler all game? He didn’t see you either, he forgot you like Riot forgot about toplane.",
        "You play tank, but in reality, you have the durability of an AP support in early game.",
        "You're so isolated on your lane that even explorers can't find you.",
        "Are you a midlaner or a tourist? Because you've visited the fountain more than your lane.",
        "Even Annie bot would have played the lane better.",
        "Your farm is as rare as a Shyvana rework.",
        "Did you pick jungler or a PVE simulator?",
        "My warding has more impact on the game than you.",
        "Even the Scuttle Crab has more presence on the map than you.",
        "If I wanted to play a game without a jungler, I would have put a bot in your place.",
        "You play ADC, but you deal as much damage as a full-tank Soraka.",
        "If I wanted to play 1v2 bot lane, I would have locked Teemo.",
        "Why did you Flash? To escape your own talent?",
        "You're supposed to auto-attack, not stare at the screen like a spectator.",
        "You're supposed to protect your ADC, not give them a tutorial on how to die.",
        "You have more wards in your inventory than on the map.",
        "If assisting your ADC was a quest, you'd have 0% completion.",
        "You placed a shield… but on the enemy jungler.",
    ],
    'csgo': [
        "You're so bad that even the bots have better aim than you.",
        "If the goal of the game was to miss shots, you’d already have a Major.",
        "Your crosshair is just decoration, admit it.",
        "You have a kill/death ratio lower than the price of a PP-Bizon.",
        "You're a real eco round—you bring nothing to the team.",
        "You picked up the AWP but forgot that aiming is important.",
        "Is your AWP a sniper or a blunderbuss? Because you haven’t hit anyone.",
        "You missed a shot at point-blank range, congrats, reversed KennyS.",
        "You're more expensive than a dropped AWP, but just as useless.",
        "You have more failed sprays than kills.",
        "Your AK fires in random patterns like it's a gacha game.",
        "Your aim is so bad that even a P90 would be an upgrade.",
        "You're a hothead… but never the one landing headshots.",
        "I don't know if you're an IGL or a broken GPS, but we're always lost.",
        "You called a B rush, but really, you just rushed your brain.",
        "Your only game plan is hoping the enemy misses their shots.",
        "You play CS like a soccer match—only passing, never shooting.",
        "You faked a bomb plant… but it turned out to be a fake for us too.",
        "You tried a ninja defuse, but you ninja'd nothing.",
        "You missed the defuse timer, GG WP Bronze 1.",
        "If CS was a school subject, you’d have repeated the year three times.",
        "Your skill is as hard to find as Source 1 hitboxes.",
        "You've missed more shots than your country's economy.",
        "You have 30ms ping but a reaction time of three days.",
        "You're like a poorly thrown flash—you troll your own team more than the enemies."
    ]
};
