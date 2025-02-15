import Utils from "./Utils.js";
import mineflayer from "mineflayer";
import Index from "./Index.js";
import fs from "fs";


class MineflayerHandler
{
    bot;
    OPTIONS;
    currentMessageType;
    messageBuffer;
    onlineMembers;

    constructor()
    {
        this.OPTIONS = Index.CONFIG.mineflayer;
        this.bot = mineflayer.createBot(this.OPTIONS);
        this.bot.on("end", this._handleMinecraftDisconnect.bind(this));
        this.bot.on("message", this._handleMinecraftMsg.bind(this));
        this.messageBuffer = [];
        setTimeout(this.sendLimbo.bind(this), 10_000);
        setInterval(this.sendLimbo.bind(this), 60_000);
    }

    sendLimbo()
    {
        if (!this.bot) return;
        this.bot.chat('/limbo')
    }

    sendToGc(msg)
    {
        if (this.bot === null) return;
        if (msg.length > 255) msg = msg.slice(0, 255);
        this.bot.chat("/gc " + msg);
    }

    async remindPlayer(player, timeMs, message, iter=0)
    {
        if (iter > 10) return;
        if (timeMs < 1000) return;
        await Utils.sleep(timeMs);
        if (!this.bot)
        {
            await this.remindPlayer(player, 15 * 1000, message, iter + 1);
            return;
        }

        try
        {
            this.bot.chat(`/msg ${player} ${message}`);
        }
        catch (e)
        {
            console.error(e);
        }
    }

    async getOnlineMembers(retrys=100)
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

        /* handle all chat and commands */
        if (this.currentMessageType)
        {
            if (this.currentMessageType === 'unknown')
            {
                this.currentMessageType = this.getMessageType(msg);
            }
            this.messageBuffer.push(msg);
            if (msg === '-----------------------------------------------------')
            {
                switch (this.currentMessageType)
                {
                    case 'g online': this.onlineMembers = this.messageBuffer.join('\n');
                    default: {
                        this.currentMessageType = null;
                        this.messageBuffer = [];
                    }
                }
            }
        }
        else if (msg === '-----------------------------------------------------')
        {
            this.currentMessageType = 'unknown';
            this.messageBuffer.push(msg);
            return;
        }
        else if (msg === '--------------  Guild: Message Of The Day  --------------')
        {
            this.currentMessageType = 'motd';
            this.messageBuffer.push(msg);
            return;
        }

        /* handle direct messages */

        let words = msg.split(' ');
        if (msg.startsWith('From '))
        {
            words.shift();
            if (words[0].startsWith("[")) words.shift(); // get rid of hypixel rank
            words[0] = words[0].slice(0, -1);

            switch (words.splice(1, 1)[0].toLowerCase())
            {
                case 'rm':
                case 'remindme':
                {
                    console.log('setting up reminder')
                    this.remindPlayer(words.shift(), Utils.parseTimeNotation(words.shift()), words.join(' '));
                    break;
                }
            }
            return;
        }

        /* handle guild chat */

        if (typeof msg !== "string" || !msg.startsWith("Guild > "))
        {
            return;
        }

        words.shift(); // get rid of "Guild > "
        words.shift(); // get rid of "Guild > "
        if (words[0].startsWith("[")) words.shift(); // get rid of hypixel rank
        if (words[0] === this.bot.username) return; // ignore msgs sent by us
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

        // placeMentions(words);

        Index.discordHandler.sendWebhookMessage(words.shift(), words.join(" "));
    }

    getMessageType(msg)
    {
        if (msg.startsWith('Guild Name:')) return "g online";
        return 'unknown'
    }

}
export default MineflayerHandler;