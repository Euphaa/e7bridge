import DiscordHandler from "./DiscordHandler.js";
import MineflayerHandler from "./MineflayerHandler.js";
import fs from "fs";

class Index
{
    static configPath = './config.json';
    static CONFIG;
    static discordHandler;
    static mineflayerHandler;


    static async main()
    {
        Index.getConfig();
        Index.discordHandler = await new DiscordHandler().init();
        Index.mineflayerHandler = new MineflayerHandler();
        if (process.argv.includes("-r")) await Index.discordHandler.registerCommandsWithServer();
    }

    static getConfig()
    {
        try
        {
            var file = fs.readFileSync(Index.configPath, 'utf8');
        }
        catch (e)
        {
            console.error('------------------------\n' +
                'config file not found D:  copy example-config.json and name it config.json and fill in your info (;\n' +
                '------------------------\n', e);
            process.exit(1);
        }

        try
        {
            Index.CONFIG = JSON.parse(file);
        }
        catch (e)
        {
            console.error('------------------------\n' +
                'config file is broken D:  please make sure that it is all correct syntax\n' +
                '------------------------\n', e);
            process.exit(1);
        }
    }
}
export default Index;

process.on("SIGINT", () => {
    Index.mineflayerHandler.bot.quit();
    Index.discordHandler.sendMessageWithoutWebhook(`<@${Index.discordHandler.OPTIONS.ownerId}> bot is down ): [SIGINT]`);
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('uncaughtException', error => {
    // Index.mineflayerHandler.bot.quit();
    console.error(error);
    Index.discordHandler.sendMessageWithoutWebhook(`<@${Index.discordHandler.OPTIONS.ownerId}> bot is down ): [SIGINT]`);
    setTimeout(() => {
        process.exit(1);
    }, 1000);
})

process.on('SIGTERM', () => {
    Index.mineflayerHandler.bot.quit();
    Index.discordHandler.sendMessageWithoutWebhook(`<@${Index.discordHandler.OPTIONS.ownerId}> bot is down ): [SIGINT]`);
    setTimeout(() => {
        process.exit(0);
    }, 1000);
})

Index.main();

