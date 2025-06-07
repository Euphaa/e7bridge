import Utils from "./Utils.js";
import Main from "./Main.js";
import * as path from "node:path";
import { Client as DiscordClient, Events, GatewayIntentBits, Collection, Routes, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import fs from 'fs';
import pathToFileURL from "url";


export default class DiscordHandler
{
    static commands = new Collection();
    discord;
    guild;
    channel;
    guildAvatar;
    webhook;
    OPTIONS;

    constructor(options)
    {
        this.discord = new DiscordClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
        this.OPTIONS = options;
    }

    async init()
    {
        this.discord.once(Events.ClientReady, this._onReady.bind(this));
        this.discord.on(Events.MessageCreate, this._handleDiscordMessage.bind(this));
        this.discord.on(Events.InteractionCreate, this._handleUnknownCommand.bind(this));

        await this.discord.login(this.OPTIONS.token);
        this.guild = await this.discord.guilds.fetch(this.OPTIONS.guildId);
        await this.loadCommands();


        await this.registerCommandsWithServer();
        return this;
    }

    sendEmbed(msg, color)
    {
        color = color || 0x217fd1;
        if (!this.channel)
        {
            console.error("erm, can't send bc there is no channel");
            return;
        }
        this.channel.send({
            embeds: [new EmbedBuilder()
                .setColor(color)
                .setDescription(Utils.escapeDiscordMarkdown(msg))]
        });
    }

    async sendWebhookMessage(name, msg, usePlayerAvatar=true)
    {
        let iconToUse = (usePlayerAvatar) ? 'https://www.mc-heads.net/avatar/' + name : this.guildAvatar;

        this.webhook.send({
            content: Utils.escapeDiscordMarkdown(msg),
            username: name,
            avatarURL: iconToUse
        });
    }

    sendMessageWithoutWebhook(msg)
    {
        if (msg.length < 1) return;
        this.channel.send(msg)
    }

    async _handleUnknownCommand(interaction)
    {
        if (!interaction.isChatInputCommand()) return;
        const command = DiscordHandler.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            interaction.reply(`you are too skill issued to use the "${interaction.commandName}" command.`, true)
            return;
        }

        try {
            await command.execute(interaction);
        }
        catch (e)
        {
            console.error(e);
            if (interaction.replied || interaction.deferred)
            {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            else
            {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }



    async loadCommands()
    {
        const commandFiles = fs.readdirSync('./src/discordCommands').filter(file => file.endsWith('.js'));

        for (const file of commandFiles)
        {
            try
            {
                const commandPath = path.join(process.cwd(), 'src/discordCommands', file);
                const commandUrl = pathToFileURL.pathToFileURL(commandPath).href;

                console.log('Importing:', commandUrl);
                const command = (await import(commandUrl)).default;

                DiscordHandler.commands.set(command.data.name, command);
            }
            catch (error)
            {
                console.error(`Failed to load command ${file}:`, error);
            }
        }
    }

    async registerCommandsWithServer()
    {
        const commands = [];
        const rest = new REST().setToken(this.OPTIONS.token);


        for (const command of DiscordHandler.commands.values())
        {
            if (!command || !command.data || typeof command.data.toJSON !== 'function') {
                console.warn("Malformed command:", command);
                console.log(command)
            }
            commands.push(command.data.toJSON());
        }

        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const serverId = this.OPTIONS.serverID;
        console.log(`Guild ID: ${serverId}`);

        const data = await rest.put(
            Routes.applicationGuildCommands(this.discord.application.id, serverId),
            {body: commands},
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }

    async _onReady(readyClient)
    {
        this.channel = await this.discord.channels.fetch(this.OPTIONS.channelID).then(c => this.channel = c);
        this.guild = await this.discord.guilds.cache.get(this.OPTIONS.serverID);
        this.guildAvatar = await this.guild.iconURL();
        let webhooks = await this.channel.fetchWebhooks();
        this.webhook = await webhooks.find(w => w.owner.username + w.owner.discriminator === this.discord.user.username + this.discord.user.discriminator);
        // guild.members.fetch();

        if (!this.webhook)
        {
            console.log("making new Webhook...");
            this.channel.createWebhook({
                name: "GuildBridge",
                avatar: this.guildAvatar,
                channel: this.OPTIONS.channelID
            }).then(w => this.webhook = w);
        }

        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
        this.sendEmbed("Bot Connected!", 0x21d127);
    }

    static generateMessageWithEmbed(msg, color)
    {
        return {
            embeds: [new EmbedBuilder()
                .setColor(color)
                .setDescription(Utils.escapeDiscordMarkdown(msg))
            ]
        }
    }

    _handleDiscordMessage(message)
    {
        if (message.channel.id !== this.channel.id) return;
        if (!DiscordHandler.isNormalMessage(message)) return;
        if (message.author.id === this.discord.id) return;

        let name = message.guild.members.cache.get(message.author.id).nickname;
        if (name === null) name = message.author.displayName

        this.fetchReplyingToName(message).then(replyingTo => {
            if (replyingTo) name = `${name} ↷ ${replyingTo}`;
            if (message.attachments.size < 1)
            {
                Main.mineflayerHandler.sendToGc(`${name}: ${this.replaceMentions(message.content)}`);
                console.log(`Discord Chat > ${name}: ${message.content}`);
            }
            else
            {
                Main.mineflayerHandler.sendToGc(`${name}: ${this.replaceMentions("[sent file] " + message.content)}`);
                console.log(`Discord Chat > ${name}: ${"[sent file] " + message.content}`);
            }
            if (message.content.startsWith("!")) Main.mineflayerHandler.parseGuildCommand(name, message.content);
        });
    }

    replaceMentions(message)
    {
        // user mentions
        const userRegex = /<@!?(\d+)>/g;
        message = message.replace(userRegex, (match, userId) => {
            const user = this.discord.users.cache.get(userId);
            return user ? `@${user.username}` : match;
        });

        // channel mentions
        const channelRegex = /<#(\d+)>/g;
        message = message.replace(channelRegex, (match, channelId) => {
            const channel = this.discord.channels.cache.get(channelId);
            return channel ? `#${channel.name}` : match;
        });

        // role mentions
        const roleRegex = /<@&(\d+)>/g;
        message = message.replace(roleRegex, (match, roleId) => {
            const role = this.guild.roles.cache.get(roleId);
            return role ? `@${role.name}` : match;
        });

        return message;
    }

    static isNormalMessage(message)
    {
        if (message.webhookId) return false;
        if (message.system) return false;
        if (message.embeds && message.embeds.length > 0) return false;
        // if (message.content === '') return false;

        return true;
    }

    async fetchReplyingToName(message)
    {
        try
        {
            if (!message.reference) return null;

            const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

            return referencedMessage.member ? referencedMessage.member.displayName : referencedMessage.author.username;
        }
        catch (e)
        {
            return null;
        }
    }
}