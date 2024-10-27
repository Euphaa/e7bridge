class PingCommand
{
    constructor()
    {
        this.name = 'ping';
        this.description = 'Pong!';
    }

    async execute(interaction)
    {
        interaction.reply('Pong!');
    }
}
export default PingCommand;