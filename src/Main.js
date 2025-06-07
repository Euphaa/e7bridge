import DiscordHandler from "./DiscordHandler.js";
import MineflayerHandler from "./MineflayerHandler.js";
import Scheduler from "./Scheduler.js";
import config from "../config.json" with { type: "json" };

export default class Main
{
    static discordHandler;
    static mineflayerHandler;
    static scheduler;


    static async main()
    {
        this.scheduler = new Scheduler();
        this.discordHandler = await new DiscordHandler(config.discord).init();
        this.mineflayerHandler = new MineflayerHandler(config.mineflayer);
        if (process.argv.includes("-r")) await this.discordHandler.registerCommandsWithServer();
    }

}

process.on("SIGINT", () => {
    Main.mineflayerHandler.bot.quit();
    Main.discordHandler.sendMessageWithoutWebhook(`<@${Main.discordHandler.OPTIONS.ownerId}> bot is down ): [SIGINT]`);
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('uncaughtException', error => {
    console.error(error);
    Main.discordHandler.sendMessageWithoutWebhook(`<@${Main.discordHandler.OPTIONS.ownerId}> bot is down ): [SIGINT]`);
    setTimeout(() => {
        process.exit(1);
    }, 1000);
})

process.on('SIGTERM', () => {
    Main.mineflayerHandler.bot.quit();
    Main.discordHandler.sendMessageWithoutWebhook(`<@${Main.discordHandler.OPTIONS.ownerId}> bot is down ): [SIGINT]`);
    setTimeout(() => {
        process.exit(0);
    }, 1000);
})

Main.main();

