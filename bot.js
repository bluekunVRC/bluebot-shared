//Call all our prerequisite bullshit
const { Client, Collection, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const { CronJob } = require('cron');
const bot = new Client({
    intents:
    [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ]
});
var os = require('os');

var isLinux = os.platform() != 'win32';

const { guildID, token } = isLinux
    ? JSON.parse(fs.readFileSync('./config.json', 'utf8'))
    : JSON.parse(fs.readFileSync('./config-test.json', 'utf8'));

const updateVipList = require('./pedestal/updateVipList');

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];
bot.commands = new Collection();

for (const file of commandFiles)
{
    //Add all command files to the bot.commands collection
    const command = require(`./commands/${file}`);
    console.log(`Loaded command: ${file}`);
    commands.push(command.data.toJSON());
    bot.commands.set(command.data.name, command);
}

bot.once('ready', () => {
    console.log(`${bot.commands.size} total commands loaded`);
    console.log(`Signed in as ${bot.user.tag}!`);

    const rest = new REST({ version: '9' }).setToken(token);
    const clientID = bot.user.id;

    //Registers all slash commands
    (async () => {
        try
        {
            await rest.put(Routes.applicationGuildCommands(clientID, guildID), { body: commands });
            bot.guilds.fetch(guildID).then(guild => { console.log(`Successfully registered commands in guild ${guild.name}!`); });
        }
        catch (err) { console.error(err); }

        //Get list updater up on cron
        const update = new CronJob('0 */1 * * *', updatePatronsJob);
        await updatePatronsJob();
        update.start();
    })();
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    //Find command, returns if command is invalid
    const command = bot.commands.get(interaction.commandName);
    if (!command) return;

    try
    {
        console.log(`Command ${interaction.commandName} run by ${interaction.user.tag}`);
        await command.execute(interaction); //Runs command through its named JS file
    }
    catch (error)
    {
        console.error(error);
        await interaction.reply({ content: `Whoops! I've run into an error! Let someone in charge know this happened, please!`, ephemeral: true });
    }
});

async function updatePatronsJob() {
    // await updateKofiJson();
    await updatePatronsTxt();
}

async function updateKofiJson() {
    return new Promise(resolve => {
    var patrons = JSON.parse(fs.readFileSync('./patrons/patrons.json', { encoding: 'utf8' } ));
    var usersRemoved = 0;
    var usersReAdded = 0;

    bot.guilds.fetch(guildID).then(guild => {   //Load guild beforehand for failproofing
        if (!guild.available) return console.log('Guild could not be found. Skipping list update for now...');
        (async () => {
            var guildMembersRaw = await guild.members.fetch()
            var guildMembers = guildMembersRaw.toJSON();

            // Remove the name of Kofi VIPs on the JSON, who do not have the Kofi VIP role
            patrons.forEach(patron => {
                if (patron.Name === 'VIP KOFI') {
                    const member = guildMembers.find(m => m.user.id === patron.DiscordId);
                    
                    if (!member.roles.cache.some(role => role.name === 'VIP (Kofi)')) {
                        patron.Name = null;
                        usersRemoved++;
                    }
                }
            });

            // Add name (back and first time) for any Kofi VIP role haver, without a Name on the JSON
            var kofiMembers = guildMembers.filter(m => m.roles.cache.some(role => role.name === 'VIP (Kofi)'));

            kofiMembers.forEach(k => {
                const patron = patrons.find(p => p.DiscordId === k.user.id);
                if (patron && !patron.Name) { // If they are signed up on Patreon, we don't want to remove them/ downgrade them if their Kofi lapses
                    patron.Name = 'VIP KOFI';
                    patron.Tier = 'VIP (Kofi)';
                    usersReAdded++;    
                }
            })

            console.log(`${usersRemoved} Kofi VIPs (names) removed from patrons.json`);
            console.log(`${usersReAdded} Kofi VIPs (names) re-added to patrons.json`);
            fs.writeFileSync('./patrons/patrons.json', JSON.stringify(patrons, null, 2), 'utf8');          //Write to patrons.json
            console.log("updateKofiJson complete");
            resolve(true);
        })();
    })
})}

async function updatePatronsTxt() {
    return new Promise(resolve => {
        console.log("updatePatronsTxt - jobDone = true");
    var patrons = JSON.parse(fs.readFileSync('./patrons/patrons.json', { encoding: 'utf8' } ));
    var elites = [];
    // var hiddenElites = [];
    var vips = [];
    var hiddenVips = [];

    patrons.forEach(patron => {
        if (patron.VRChat === "" || !patron.Name || patron.Name === "DECLINED") return;

        if (patron.Tier !== "Elite") {
            if (patron.Name === "HIDDEN") {
                hiddenVips.push(patron.VRChat);
            } else {
                vips.push(patron.VRChat);
            }
        } else {
            elites.push(patron.VRChat);
        }
    });

    elites.sort();
    vips.sort();
    hiddenVips.sort();

    console.log(`There are: ${elites.length} elites; ${vips.length} vips; ${hiddenVips.length} hidden vips`);

    var txtContents = ' Blue-kun \n'
        + elites.join('\n')
        + ',\n'
        + vips.join('\n')
        + '\n,\n'
        + hiddenVips.join('\n');

    fs.writeFileSync('./patrons/patrons.txt', txtContents, 'utf8');     //Write to patrons.txt
    console.log(`patrons.txt updated!`);

    // if (!isLinux) {
    //     console.log("Testing locally - do not update pedestal");
    //     return;
    // }
    console.log("updatePatronsTxt - letsFuckingGo");
    updateVipList.letsFuckingGo();
    resolve(true);
});
    }

bot.login(token);