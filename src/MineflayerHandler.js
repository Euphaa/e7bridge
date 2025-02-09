import Utils from "./Utils.js";
import mineflayer from "mineflayer";
import Index from "./Index.js";

class MineflayerHandler
{
    bot;
    OPTIONS;
    currentMessageType;
    messageBuffer = [];
    onlineMembers;
    commandQueue = [];

    constructor()
    {
        this.OPTIONS = Index.CONFIG.mineflayer;
        this.bot = mineflayer.createBot(this.OPTIONS);
        this.bot.on("end", this._handleMinecraftDisconnect.bind(this));
        this.bot.on("message", this._handleMinecraftMsg.bind(this));
        this.messageBuffer = [];
        setTimeout(this.sendLimbo.bind(this), 5_000);
        setInterval(this.sendLimbo.bind(this), 60_000);
        setInterval(this._shiftCommandQueue.bind(this), 500)
    }

    _shiftCommandQueue()
    {
        if (this.commandQueue.length < 1) return;
        let command = this.commandQueue.shift();
        if (command === null || typeof command !== typeof "" || this.bot === null) return;

        this.bot.chat(command);
    }

    sendLimbo()
    {
        this.commandQueue.push("/limbo")
    }

    sendToGc(msg)
    {
        if (msg.length > 120) msg = msg.slice(0, 120);
        console.log(`sending to gc: ${msg}`)

        this.commandQueue.push("/gc " + msg)
    }

    sendToGcWithRandomString(msg)
    {
        this.sendToGc(msg + ` <${Math.random().toString(36).slice(2, 5)}>`);
    }

    // async remindPlayer(player, timeMs, message, iter=0)
    // {
    //     // if (iter > 10) return;
    //
    //     // if (timeMs < 1000) return;
    //     await Utils.sleep(timeMs);
    //     // if (!this.bot)
    //     // {
    //     //     await this.remindPlayer(player, 15 * 1000, message, iter + 1);
    //     //     return;
    //     // }
    //
    //     try
    //     {
    //         this.sendDmTo(player, message);
    //     }
    //     catch (e)
    //     {
    //         console.error(e);
    //     }
    // }

    sendDmTo(player, msg)
    {
        this.commandQueue.push(`/msg ${player} ${msg}`)
    }

    async getOnlineMembers(retrys=40)
    {
        while (!this.onlineMembers && retrys > 0)
        {
            await Utils.sleep(50);
            retrys--;
        }
        let members = this.onlineMembers;
        this.onlineMembers = null;
        return members;
    }

    async _handleMinecraftDisconnect()
    {
        Index.discordHandler.sendEmbed("Bot Disconnected", 0xd12121);
        await Utils.sleep(10_000);
        this.bot = mineflayer.createBot(this.OPTIONS);
        Index.discordHandler.sendEmbed("Bot Connected!", 0x21d127);
    }

    _handleMinecraftMsg(jsonMsg, position, sender, verified)
    {
        let msg = jsonMsg.toString();

        /* handle guild chat */

        if (msg.startsWith("Guild > "))
        {
            this.handleGuildChat(msg);
            return;
        }

        /* handle direct messages */

        let words = msg.split(' ');
        if (msg.startsWith('From '))
        {
            this.handleDirectMessage(msg);
            return;
        }

        /* handle all chat */

        if (msg === '-----------------------------------------------------'
            || msg === "--------------  Guild: Message Of The Day  --------------")
        {
            console.log(`|| ${this.messageBuffer.join("\n|| ")}`)
            if (this.messageBuffer.length < 1) return;

            if (this.messageBuffer[0].startsWith("Guild Name: "))
            {
                this.onlineMembers = this.messageBuffer.join("\n");
            }

            if (this.messageBuffer[0].includes("joined the guild!")
                || this.messageBuffer[0].includes(" has unmuted "))
            {
                Index.discordHandler.sendEmbed(
                    '-----------------------------------------------------\n'
                    + this.messageBuffer[0]
                    + '\n-----------------------------------------------------',
                    0x21d127
                );
            }

            if (this.messageBuffer[0].includes("was kicked from the guild")
                || this.messageBuffer[0].includes("has muted")
                || this.messageBuffer[0].includes("left the guild!"))
            {
                Index.discordHandler.sendEmbed(
                    '-----------------------------------------------------\n'
                    + this.messageBuffer[0]
                    + '\n-----------------------------------------------------',
                    0xd12121
                );
            }

            this.messageBuffer = [];
            return;
        }

        this.messageBuffer.push(msg);
        console.log((this.messageBuffer.join("\n")))
    }

    handleDirectMessage(msg)
    {
        let words = msg.split(" ");
        words.shift();
        if (words[0].startsWith("[")) words.shift(); // get rid of hypixel rank
        words[0] = words[0].slice(0, -1); // get rid of colon after name.

        switch (words.splice(1, 1)[0].toLowerCase())
        {
            // words at this point should follow [ign, word, word, ...word]
            case 'rm':
            case 'remindme':
            {
                const player = words.shift();
                const time = Utils.parseTimeNotation(words.shift());
                const reminder = words.join(" ");
                const englishTime = Utils.msToEnglishTime(time);
                const message = `i will remind you about ${reminder} in ${englishTime}.`;

                setTimeout(this.sendDmTo.bind(this), time, player, message)
                console.log(`i will remind you about ${reminder} in ${englishTime}. (for ${player})`)

                break;
            }
            case "s":
            case "sub":
            case "subscribe":
            {
                Index.scheduler.parsePlayerRequest(words)
            }
        }
    }

    handleGuildChat(msg)
    {
        let words = msg.split(" ");

        words.shift(); // get rid of "Guild > "
        words.shift(); // get rid of "Guild > "
        if (words[0].startsWith("[")) words.shift(); // get rid of hypixel rank
        if (words[0].includes(this.bot.username)) return;
        if (words[1].startsWith('[')) // get rid of guild rank
        {
            words[0] = words[0] + ':';
            words.splice(1, 1);
        }
        if (!words[0].endsWith(':')) // this is a msg not sent by a player
        {
            Index.discordHandler.sendEmbed(words.join(' '), (words[1].includes('left')) ? 0xd12121 : 0x21d127);
            return;
        }
        words[0] = words[0].slice(0, -1); // removes the colon from the name

        const name = words.shift()
        Index.discordHandler.sendWebhookMessage(name, words.join(" "));

        if (words[0].startsWith("!"))
        {
            this.parseGuildCommand(name, words);
        }
    }

    parseGuildCommand(name, words)
    {
        if (Math.random() > .99
            || ((name === "rjl_" || name === "rilei") && Math.random() > .9))
        {
            this.sendToGcWithRandomString("You are too skill issued to use this command.")
            Index.discordHandler.sendWebhookMessage(this.bot.username,  "You are too skill issued to use this command.", false);
            return;
        }
        switch (words[0])
        {
            case "!r":
            case "!roll":
            {
                let maxRoll = 6;
                if (words.length > 1) maxRoll = parseInt(words[1].slice(0, 99));
                const roll = 1 + Math.floor(Math.random() * maxRoll);
                let msg = `${name} rolled ${roll}`;

                this.sendToGcWithRandomString(msg);
                Index.discordHandler.sendWebhookMessage(this.bot.username,  msg, false);
                break;
            }
            case "!gay":
            {
                let roll = Math.floor(Math.random() * 101);
                if (name === "_brent_") roll = 100;
                if (name === "MissEepy") roll = 101;
                const msg = `${name} is ${roll}% gay`;
                this.sendToGcWithRandomString(msg);
                Index.discordHandler.sendWebhookMessage(this.bot.username,  msg, false);
                break;
            }
            case "!cf":
            case "!flip":
            case "!coinflip":
            {
                const msg = `${name} flipped a coin and got ${Math.random() < .5 ? "heads" : "tails"}!`;
                this.sendToGcWithRandomString(msg);
                Index.discordHandler.sendWebhookMessage(this.bot.username,  msg, false);
                break;
            }
            case "!muterjl_":
            case "!muterjl":
            {
                if (this.bot === null) return;
                this.bot.chat("/g mute rjl_ 1m");
                break;
            }
            case "!rm":
            case "!remindme":
            case "!reminder":
            {
                words.shift();
                const time = Utils.parseTimeNotation(words.shift());
                const reminder = words.join(" ");
                const englishTime = Utils.msToEnglishTime(time);
                const message = `i will remind you about ${reminder} in ${englishTime}.`;

                setTimeout(this.sendToGc.bind(this), time, message)
                console.log(`i will remind you about ${reminder} in ${englishTime}. (for ${name})`)

                break;
            }
        }
    }
}
export default MineflayerHandler;