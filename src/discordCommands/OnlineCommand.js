import { SlashCommandBuilder } from 'discord.js';
import Main from '../Main.js';
import DiscordHandler from '../DiscordHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('online')
        .setDescription('Run /g online and fetch online guild members'),

    async execute(interaction) {
        Main.mineflayerHandler.bot.chat('/g online');

        const members = await Main.mineflayerHandler.getOnlineMembers();

        if (!members)
        {
            await interaction.reply({
                content: 'Could not fetch online members ):',
                ephemeral: true
            });
        }
        else
        {
            await interaction.reply(
                DiscordHandler.generateMessageWithEmbed(members, 0x217fd1)
            );
        }
    }
};