import Main from "../Main.js";
import DiscordHandler from "../DiscordHandler.js";

class OnlineCommand
{
    constructor()
    {
        this.name = 'online';
        this.description = 'run /g online';
    }

    async execute(interaction)
    {
        Main.mineflayerHandler.bot.chat('/g online');
        let members = await Main.mineflayerHandler.getOnlineMembers();

        if (!members)
        {
            interaction.reply({content: 'could not fetch online members ):', ephemeral: true})
        }
        else
        {
            interaction.reply(DiscordHandler.generateMessageWithEmbed(members, 0x217fd1));
        }
    }
}
export default OnlineCommand;