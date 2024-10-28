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

    static msToTimeNotation(ms)
    {
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        seconds = seconds % 60;
        minutes = minutes % 60;

        let timeString = '';
        if (hours > 0) timeString += hours + 'h';
        if (minutes > 0) timeString += minutes + 'm';
        if (seconds > 0 || timeString === '') timeString += seconds + 's';

        return timeString;
    }
}
export default Utils;