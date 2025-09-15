import Utils from "./Utils.js";
import mineflayer from "mineflayer";
import Main from "./Main.js";
import DiscordHandler from "./DiscordHandler.js";

export default class MineflayerHandler
{
    bot;
    OPTIONS;
    currentMessageType;
    messageBuffer = [];
    onlineMembers;
    commandQueue = [];
    previousCommand;

    constructor(options)
    {
        setInterval(() => {}, 100000000);
        options.auth = "microsoft";
        this.OPTIONS = options;
        this.bot = mineflayer.createBot(this.OPTIONS);
        this.bot.once("spawn", () => {
            this.bot.on("end", this._handleMinecraftDisconnect.bind(this));
            this.bot.on("kicked", this._handleMinecraftDisconnect.bind(this));
            this.bot.on("message", this._handleMinecraftMsg.bind(this));
            this.sendLimbo();
            setInterval(this.sendLimbo.bind(this), 60_000);
            setInterval(this._shiftCommandQueue.bind(this), 500);
            Main.discordHandler.sendEmbed("Bot Connected!", 0x21d127);
        });
    }

    _shiftCommandQueue()
    {
        if (this.commandQueue.length < 1) return;

        let command = this.commandQueue.shift();
        if (command === null || typeof command !== typeof "" || this.bot === null) return;

        command = this.sanitize(command);
        console.warn(`sending command: ${command}`);
        this.previousCommand = command;
        this.bot.chat(command);
    }

    sanitize(command)
    {
        command = command.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '***.***.***.***');
        command = command.replace(/\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/, "**.**");
        return command;
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

        const patternHandlers = [
            {
                pattern: /Guild > (?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+)(?: \[(?<tag>.*?)\])?: (?<message>.+)/,
                handler: (groups) => {
                    if (groups.name === this.bot.username) return;

                    Main.discordHandler.sendWebhookMessage(groups.name, groups.message);
                    if (groups.message.startsWith("!"))
                        this.parseGuildCommand(groups.name, groups.message);
                }
            },
            {
                pattern: /^Guild > (?<name>[A-Za-z0-9_]+) (?<action>joined|left)\.$/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        `${groups.name} ${groups.action}.`,
                        groups.action === "left" ? 0xd12121 : 0x21d127
                    );
                }
            },
            {
                pattern: /^Guild > (?<name>[A-Za-z0-9_]+) (?<action>joined|left)\.$/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        `${groups.name} ${groups.action}.`,
                        groups.action === "left" ? 0xd12121 : 0x21d127
                    );
                }
            },
            {
                pattern: /From (?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+): (?<message>.+)/,
                handler: (groups) => {
                    this.handleDirectMessage(groups.rank, groups.name, groups.message);
                }
            },
            {
                pattern: /^[-]+\n(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+) has invited you to join their party!\nYou have 60 seconds to accept\. Click here to join!\n[-]+$/,
                handler: (groups) => {
                    let roll = Math.random();
                    console.log(roll);
                    if (roll > 0.7) {
                        this.commandQueue.push(`/p join ${groups.name}`);
                        this.commandQueue.push("/pc ♿");
                        this.commandQueue.push("/p leave");
                    }
                }
            },
            {
                pattern: /^[-]+\n(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+) has invited you to join (?:\[(?<victimRank>.*?)\] )?(?<victimName>[A-Za-z0-9_]+)(?: \[(?<victimTag>.*?)\])?'s party!\nYou have 60 seconds to accept\. Click here to join!/,
                handler: (groups) => {
                    let roll = Math.random();
                    console.log(roll);
                    if (roll > 0.85 || groups.name === "Euphaa") {
                        this.commandQueue.push(`/p join ${groups.name}`);
                        this.commandQueue.push("/pc ♿");
                        this.commandQueue.push("/p leave");
                    }
                }
            },
            {
                /* this message signifies the start or end of some info block, so we search for any info we need here. */
                pattern: /-----------------------------------------------------/,
                handler: (groups) => {
                    if (this.messageBuffer.length < 1) return;

                    if (this.messageBuffer[0].startsWith("Guild Name: "))
                    {
                        this.onlineMembers = this.messageBuffer.join("\n");
                    }

                    this.messageBuffer = [];
                }
            },
            {
                /* gotta reset here otherwise the following hyphen pattern will update old info */
                pattern: /--------------  Guild: Message Of The Day  --------------/,
                handler: (groups) => {
                    this.messageBuffer = [];
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+)(?: \[(?<tag>.*?)\])? has muted (?:\[(?<victimRank>.*?)\] )?(?<victimName>[A-Za-z0-9_]+)(?: \[(?<victimTag>.*?)\])? for (?<duration>.+)/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0xd12121
                    );
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+) joined the guild!/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0x21d127
                    );
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+)(?: \[(?<tag>.*?)\])? has muted (?:\[(?<victimRank>.*?)\] )?(?<victimName>[A-Za-z0-9_]+)(?: \[(?<victimTag>.*?)\])?/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0x21d127
                    );
                }
            },
            {
                pattern: /(?:\[(?<victimRank>.*?)\] )?(?<victimName>[A-Za-z0-9_]+)(?: \[(?<victimTag>.*?)\])? was kicked from the guild by (?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+)(?: \[(?<tag>.*?)\])?!/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0xd12121
                    );
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+)(?: \[(?<tag>.*?)\])? left the guild!/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0xd12121
                    );
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+) was promoted from (?<oldRank>[A-Za-z0-9_ ]+) to (?<newRank>[A-Za-z0-9_ ]+)/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0x21d127
                    );
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+) was demoted from (?<oldRank>[A-Za-z0-9_ ]+) to (?<newRank>[A-Za-z0-9_ ]+)/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0xd12121
                    );
                }
            },
            {
                pattern: /Advertising is against the rules. You will receive a punishment on the server if you attempt to advertise./,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(`:warning::warning::warning::warning::warning:\nreceived warning for advertising:\n${this.previousCommand}\n:warning::warning::warning::warning::warning:`, 0xd12121);
                }
            },
            {
                pattern: /(?:\[(?<rank>.*?)\] )?(?<name>[A-Za-z0-9_]+)(?: \[(?<tag>.*?)\])? transferred Guild Master rank to (?:\[(?<victimRank>.*?)\] )?(?<victimName>[A-Za-z0-9_]+)(?: \[(?<victimTag>.*?)\])?/,
                handler: (groups) => {
                    Main.discordHandler.sendEmbed(
                        '-----------------------------------------------------\n'
                        + msg
                        + '\n-----------------------------------------------------',
                        0xd12121
                    );
                }
            }
        ];

        for (const { pattern, handler } of patternHandlers)
        {
            const match = msg.match(pattern);
            if (match !== null)
            {
                handler(match.groups);
                console.log("# " + msg.replace(/[\r\n]+/g, "\n# "));

                return;
            }
        }

        const ignoredPatterns = [
            /The lobby you attempted to join was full or offline\./,
            /Because of this, you were routed to Limbo, a subset of your own imagination\./,
            /This place doesn't exist anywhere, and you can stay here as long as you'd like\./,
            /To return to "reality", use \/lobby GAME\./,
            /Examples: \/lobby, \/lobby skywars, \/lobby arcade/,
            /Watch out, though, as there are things that live in Limbo\./
        ];

        for (const pattern of ignoredPatterns)
        {
            if (msg.match(pattern) !== null) return;
        }

        console.log(msg.replace(/[\r\n]+/g, ""));
        this.messageBuffer.push(msg);
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

    parseGuildCommand(name, message)
    {
        let words = message.split(" ");
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
                const errorMsg = "incorrect usage <time> <reminder>; example usage: !rm 1h30m divorce my wife again";
                const time = Utils.parseTimeNotation(words[1]);
                if (time < 1000)
                {
                    Main.discordHandler.sendWebhookMessage(this.bot.username, errorMsg, false);
                    this.sendToGc(errorMsg);
                    return;
                }

                words.shift();
                words.shift();

                const reminder = words.join(" ");
                const englishTime = Utils.msToEnglishTime(time);
                let message = `i will remind you in ${englishTime}.`;
                if (reminder.length < 1) message = `i will remind you in ${englishTime}`;

                setTimeout(
                    (s) => {
                        this.sendToGc(s);
                        Main.discordHandler.sendWebhookMessage(this.bot.username, s, false);
                    },
                    time,
                    `reminder requested by ${name}: ${reminder}`
                );
                Main.discordHandler.sendWebhookMessage(this.bot.username, message, false);
                this.sendToGc(message);

                break;
            }
        }
    }
}