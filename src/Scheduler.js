import {Collection} from "discord.js";
import Index from "./Index.js";
import Utils from "./Utils.js";

class Scheduler
{
    static events = new Collection();
    ongoingNotifications = new Collection();
    static {
        const eventsList = [
            {name:"dark auction", interval:1000*60*60, initial:1730084100000%(1000*60*60),  aliases: ["da", "darkauction"]},
            {name:"farming contest", interval:1000*60*60, initial:1730096100000%(1000*60*60),  aliases: ["contest", "jacob"]},
            {name:"spider's den thunder", interval:1000*60*60*3, initial:1730086500000%(1000*60*60),  aliases: ["thunder"]},
            {name:"cult of the fallen star", interval:1000*60*200, initial:1730088900000%(1000*60*60),  aliases: ["cult", "star", "stars"]},
            {name:"spooky festival", interval:1000*60*60*124, initial:1730084100000%(1000*60*60*124),  aliases: ["spooky"]},
            {name:"traveling zoo", interval:1000*60*60*124, initial:1730242500000%(1000*60*60*124), aliases: ["zoo", "oringo"]},
            {name:"season of jerry", interval:1000*60*60*124, initial:1730344500000%(1000*60*60*124), aliases: ["jerry"]},
            {name:"new year cake", interval:1000*60*60*124, initial:1730350500000%(1000*60*60*124), aliases: ["cake", "newyear"]},
            {name:"hoppity's hunt", interval:1000*60*60*124, initial:1730354100000%(1000*60*60*124), aliases: ["hoppity"]},
            {name:"election booth opens", interval:1000*60*60*124, initial:1730124900000%(1000*60*60*124), aliases: ["election"]},
        ]

        for (const event of eventsList)
        {
            for (const alias of event.aliases)
            {
                Scheduler.events.set(alias, event);
            }
        }
    }


    parsePlayerRequest(words)
    {
        console.log(words);
        let indexOfUnsub = words.indexOf("-u");
        if (indexOfUnsub > 0)
        {
            this.unsubscribePlayerFromEvent(words[0], words[indexOfUnsub + 1]);
            return;
        }

        if (words[1] === "list")
        {
            Index.mineflayerHandler.sendDmTo(words[0], `${[...this.events.keys()]}`);
            return;
        }

        if (words.length < 3)
        {
            Index.mineflayerHandler.sendDmTo(words[0], "not enough args given! usage: /r sub da 1m30s");
            return;
        }

        let request = {
            event: words[1],
            player: words[0],
            paddingTime: Utils.parseTimeNotation(words[2]),
            repeats: -1
        }

        if (!Scheduler.events.has(request.event))
        {
            Index.mineflayerHandler.sendDmTo(words[0], `${request.event} is not a valid event name! to get a list of events use /r sub list`);
            return;
        }

        else if (request.paddingTime < 1000 || request.paddingTime > 1000*60*60)
        {
            Index.mineflayerHandler.sendDmTo(request.player, "time before notification must be between 1s and 1h. ex: 11m30s");
            return;
        }

        let thisPlayersEvents = this.getPlayersEvents(request.player);

        thisPlayersEvents.push(request);
        this.subscribePlayerTo(request)

        Index.mineflayerHandler.sendDmTo(request.player, `i will remind you ${Utils.msToTimeNotation(request.paddingTime)} before every ${Scheduler.events.get(request.event).name}.`)
    }

    getPlayersEvents(player)
    {
        let thisPlayersEvents = this.ongoingNotifications.get(player);
        if (!thisPlayersEvents)
        {
            thisPlayersEvents = [];
            this.ongoingNotifications.set(player, thisPlayersEvents);
        }

        return thisPlayersEvents;
    }

    unsubscribePlayerFromEvent(player, event)
    {
        let thisPlayersEvents = this.getPlayersEvents(player);

        for (let i = 0; true; i++)
        {
            if (i < thisPlayersEvents.length) break;
            if (thisPlayersEvents[i].event === event)
            {
                clearTimeout(thisPlayersEvents[i].timeoutId);
                thisPlayersEvents.splice(i, 1);
                i--;
            }
        }

        Index.mineflayerHandler.sendDmTo(player, `unsubscribed you from all ${Scheduler.events.get(event).name} reminders!`)
    }

    /**
     *
     * @param request - player, event, paddingTime, (optional) repeats
     */
    subscribePlayerTo(request)
    {

        let thisPlayersEvents = this.getPlayersEvents(request.player);

        let reminderTime = Scheduler.getNextEventTime(request.event) - request.paddingTime;
        if (reminderTime < 0) return;

        request.timeoutId = setTimeout(this.notifyPlayerOfEvent.bind(this), reminderTime, request);

    }

    static getNextEventTime(eventName)
    {
        let event = Scheduler.events.get(eventName);

        if (!event)
        {
            console.log(`could not find event matching ${eventName}.`);
            return;
        }
        return event.interval - ((Date.now() - event.initial) % event.interval);
    }


    /**
     *
     * @param request - player, event, paddingTime, (optional) repeats
     */
    notifyPlayerOfEvent(request)
    {
        let {player, event, paddingTime, repeats} = request;

        console.log(`notifying ${request.player} of ${request.event} at ${(Date.now()/1000) % 24*60*60}`)

        Index.mineflayerHandler.sendDmTo(player, `this is a reminder of ${event} in ${Utils.msToTimeNotation(paddingTime)}. to stop notifs of this event, reply with /r sub -u ${request.event}`);

        if (repeats && repeats > 0)
        {
            request.repeats--;
            this.subscribePlayerTo(request);
        }
    }
}
export default Scheduler;

