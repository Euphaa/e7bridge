const DISCORD_ESCAPE_SEQUENCE = /([*_~`>|])/g;

class Utils
{
    static escapeDiscordMarkdown(msg)
    {
        return msg.replace(DISCORD_ESCAPE_SEQUENCE, '\\$1');
    }

    static async sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static parseTimeNotation(msg)
    {
        let timeInMs = 0;

        const regex = /(\d+)([hms])/g;
        let match;

        while ((match = regex.exec(msg)) !== null) {
            let value = parseInt(match[1], 10);
            let unit = match[2];

            switch (unit) {
                case 'h':
                    timeInMs += value * 60 * 60 * 1000;
                    break;
                case 'm':
                    timeInMs += value * 60 * 1000;
                    break;
                case 's':
                    timeInMs += value * 1000;
                    break;
            }
        }

        return timeInMs;
    }
}
export default Utils;