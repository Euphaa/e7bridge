import Utils from "./Utils.js";
import mineflayer from "mineflayer";
import Main from "./Main.js";

export default class MineflayerHandler
{
    bot;
    OPTIONS;
    currentMessageType;
    messageBuffer = [];
    onlineMembers;
    commandQueue = [];

    constructor(options)
    {
        options.auth = "microsoft";
        this.OPTIONS = options;
        this.bot = mineflayer.createBot(this.OPTIONS);
        this.bot.on("end", this._handleMinecraftDisconnect.bind(this));
        this.bot.on("message", this._handleMinecraftMsg.bind(this));
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
        // console.log(`sending to gc: ${msg}`)

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
        Main.discordHandler.sendEmbed("Bot Disconnected", 0xd12121);
        process.exit(1);
    }

    _handleMinecraftMsg(jsonMsg, position, sender, verified)
    {
        let msg = jsonMsg.toString();


        const guildRegex = /Guild > (?:\[(.*?)\] )?([A-Za-z0-9_]+)(?:\[(.*?)\])?: (.+)/
        let result = msg.match(guildRegex);
        if (result !== null)
        {
            console.log(result)
            this.handleGuildChat(result[1], result[2], result[3], result[4]);
            return;
        }

        const dmRegex = /From (?:\[(.*?)\] )?([A-Za-z0-9_]+): (.+)/;
        result = msg.match(dmRegex);
        if (result !== null)
        {
            console.log(result)
            this.handleDirectMessage(result[1], result[2], result[3])
            return;
        }

        console.log(msg);

        const pinvRegex = /^[-]+\n(?:\[(.*?)\] )?([A-Za-z0-9_]+) has invited you to join their party!\nYou have 60 seconds to accept\. Click here to join!\n[-]+$/
        result = msg.match(pinvRegex);
        if (result !== null && Math.random() > .85)
        {
            console.log(result)
            this.commandQueue.push(`/p join ${result[2]}`);
            this.commandQueue.push("/pc ♿");
            this.commandQueue.push("/p leave");
        }


        /* handle all chat */

        if (msg === '-----------------------------------------------------'
            || msg === "--------------  Guild: Message Of The Day  --------------")
        {
            // console.log(`|| ${this.messageBuffer.join("\n|| ")}`)
            if (this.messageBuffer.length < 1) return;

            if (this.messageBuffer[0].startsWith("Guild Name: "))
            {
                this.onlineMembers = this.messageBuffer.join("\n");
            }

            if (this.messageBuffer[0].includes("joined the guild!")
                || this.messageBuffer[0].includes(" has unmuted "))
            {
                Main.discordHandler.sendEmbed(
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
                Main.discordHandler.sendEmbed(
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
        // console.log((this.messageBuffer.join("\n")))
    }

    handleDirectMessage(rank, name, msg)
    {
        // let words = msg.split(" ");
        //
        // switch (words[0].toLowerCase())
        // {
        //     // words at this point should follow [ign, word, word, ...word]
        //     case 'rm':
        //     case 'remindme':
        //     {
        //         const player = words.shift();
        //         const time = Utils.parseTimeNotation(words.shift());
        //         const reminder = words.join(" ");
        //         const englishTime = Utils.msToEnglishTime(time);
        //         const message = `i will remind you about ${reminder} in ${englishTime}.`;
        //
        //         setTimeout(this.sendDmTo.bind(this), time, player, message)
        //         console.log(`i will remind you about ${reminder} in ${englishTime}. (for ${player})`)
        //
        //         break;
        //     }
        //     case "s":
        //     case "sub":
        //     case "subscribe":
        //     {
        //         Main.scheduler.parsePlayerRequest(words)
        //     }
        // }
    }

    handleGuildChat(rank, name, guildTag, msg)
    {
        let words = msg.split(" ");
        if (name === this.bot.username) return;

        /* i have no idea why this is here */
        // if (!words[0].endsWith(':')) // this is a msg not sent by a player
        // {
        //     Main.discordHandler.sendEmbed(words.join(' '), (words[1].includes('left')) ? 0xd12121 : 0x21d127);
        //     return;
        // }

        Main.discordHandler.sendWebhookMessage(name, words.join(" "));

        if (words[0].startsWith("!"))
        {
            this.parseGuildCommand(name, words);
        }
    }

    parseGuildCommand(name, words)
    {
        switch (words[0].toLowerCase())
        {
            case "!r":
            case "!roll":
            {
                let maxRoll = 6;
                if (words.length > 1) maxRoll = parseInt(words[1].slice(0, 99));
                const roll = 1 + Math.floor(Math.random() * maxRoll);
                let msg = `${name} rolled ${roll}`;

                this.sendToGcWithRandomString(msg);
                Main.discordHandler.sendWebhookMessage(this.bot.username,  msg, false);
                break;
            }
            case "!gay":
            {
                let roll = Math.floor(Math.random() * 101);
                if (name === "_brent_") roll = 100;
                if (name === "MissEepy") roll = 101;
                const msg = `${name} is ${roll}% gay`;
                this.sendToGcWithRandomString(msg);
                Main.discordHandler.sendWebhookMessage(this.bot.username,  msg, false);
                break;
            }
            case "!cf":
            case "!flip":
            case "!coinflip":
            {
                const msg = `${name} flipped a coin and got ${Math.random() < .5 ? "heads" : "tails"}!`;
                this.sendToGcWithRandomString(msg);
                Main.discordHandler.sendWebhookMessage(this.bot.username,  msg, false);
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
                const errorMsg = "incorrect usage <time> <reminder>; example usage: !rm 1h30m divorce my ex wife again";
                const time = Utils.parseTimeNotation(words[1]);
                if (!(time instanceof Number))
                {
                    Main.discordHandler.sendWebhookMessage("SLTGC", this.bot.username, false);
                    this.sendToGc(errorMsg);
                }

                const reminder = words.subarray(2, words.length).join();
                const englishTime = Utils.msToEnglishTime(time);
                let message = `i will remind you about ${reminder} in ${englishTime}.`;
                if (reminder.length < 1) message = `i will remind you in ${englishTime}`;

                setTimeout(this.sendToGc.bind(this), time, "reminder requested by " + name + ": " + reminder);
                Main.discordHandler.sendWebhookMessage(message, this.bot.username, false);
                this.sendToGc(message);

                break;
            }
        }
    }
}