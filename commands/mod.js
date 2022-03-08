const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
var os = require('os');

var isLinux = os.platform() != 'win32';

const { guildID, token } = isLinux
    ? JSON.parse(fs.readFileSync('./config.json', 'utf8'))
    : JSON.parse(fs.readFileSync('./config-test.json', 'utf8'));

const submitResponse = (interaction, response) => {
    interaction.reply(response.join('\n'), { split: true });
    console.log('Response submitted');
}

const emotes = {
    VIP: "<:vip:858833695816810526>",
    "VIP (Kofi)": "<:vip:858833695816810526>",
    Promoter: "<:vip:858833695816810526>",
    Elite: "<:elite:858833754150404106>",
    VRChat: "<:vrchat:919756174532952084>",
    Discord: "<:Discord:919759278460506182>"
}

module.exports =
{
    data: new SlashCommandBuilder()     //Initialize command and its subcommand(s)
        .setName('mod')
        .setDescription('Mod-only commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('vip_name')
                .setDescription('Change your VRChat name on the VIP list.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The Discord user to add to the list')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('vrchat_username')
                        .setDescription('The VRChat display name of the user to be added.')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('tier')
                        .setDescription('The tier to give to the player')
                        .addChoice("VIP", "VIP")
                        .addChoice("Promoter", "Promoter")
                        .addChoice("Elite", "Elite")
                        .addChoice("VIP (Kofi)", "VIP (Kofi)")
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The Patreon name of the player')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vip_info')
                .setDescription('View Supporter info for a user.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The Discord user to add to the list')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tier')
                .setDescription('Get a users tier from their Discord Roles (use `info` to get their list data)')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User')
                        .setRequired(true))),
    async execute(interaction)
    {
        // Check if Mod
        var userRoles = Array.from(interaction.member.roles.cache.values());
        if (!userRoles.some(role => role.name == 'Mod')) {
            console.log(`${interaction.member.name} failed to run a Mod command`);
            interaction.reply(':exclamation: Only Mods can use this command');
            return;
        }

        // Prep
        const patrons = JSON.parse(fs.readFileSync('./patrons/patrons.json', 'utf8'));
        const user = interaction.options.getUser('user');
        const homeGuild = interaction.guild;
        const guildMember = await homeGuild.members.fetch(user);
        const hasPatreonRole = guildMember.roles.cache.some(role => role.name === 'Elite' || role.name === 'VIP' || role.name === 'Promoter');
        const hasKofiRole = guildMember.roles.cache.some(role => role.name === 'VIP (Kofi)');
        const roles = guildMember.roles.cache;

        const tier = roles?.some(role => role.name === 'Elite')
        ? "Elite" 
        : roles.some(role => role.name === 'Promoter')
            ? "Promoter"
            : roles.some(role => role.name === 'VIP')
                ? "VIP"
                : roles.some(role => role.name === 'VIP (Kofi)')
                    ? "VIP (Kofi)"
                    : null;
                
        const response = [];

        if (!homeGuild.available) return console.log(`Could not get guild from ID given in config. Stopping command...`);       //Failproof for if guild is suffering from an outage
        else console.log(`Found guild ${homeGuild.name}`);

        console.log(`Checking patrons.json for Discord user ${user.tag}`);

        var foundIndex = patrons.findIndex(patron => (
            patron.DiscordId == user.id
            || patron.Discord == user.tag));

        var found = foundIndex > -1 ? patrons[foundIndex] : null;
        var active = found?.Name || hasKofiRole; 
        var declined = found?.Name === "DECLINED";
        
        // ===
        // TIER COMMAND
        // ===
        if (interaction.options.getSubcommand() === 'tier') {
            console.log(`User: ${user.tag}; Tier: ${tier}`);
            response.push(`**User**: ${user.tag} \n**Tier**: ${emotes[tier]} ${tier}`);
        }

        // ===
        // VIPINFO COMMAND
        // ===
        if (interaction.options.getSubcommand() === 'vip_info')
        {
            if (foundIndex == -1) {
                if (hasPatreonRole) {
                    console.log("New Patreon supporter with no record");
                    response.push(`**Welcome** to the Just B Club Patreon :tada: - thanks for the support!`);
                    response.push(`You are signed up for **next month** (starting on the 4th) - no payment is taken until the 1st of next month.`);
                    response.push(``);
                    response.push(`**Add your VRC display name** using **/vip name** followed by your VRC display name`);
                } else {
                    console.log("New Kofi supporter with no record");
                    response.push(`**Welcome** to the Just B Club Kofi :tada: - thanks for the support!`);
                    response.push(``);
                    response.push(`**Add your VRC display name** using **/vip name** followed by your VRC display name`);
                }
                
            } else {
                response.push(`${emotes[found.Tier]} **${found.Tier}** found!`);
                response.push(`===`);

                if (!found.VRChat) {
                    response.push(`I **don't have** a **VRChat** name on record for you.`);
                    response.push(`Please **add** your VRChat name using **/vip name** :thumbsup:`);
                }

                if (active && found?.VRChat && !declined) {
                    response.push(`Your **in-world benefits** should be **active** (unless you added/ updated your name within the past hour)`);
                }
                
                if (declined) {
                    response.push(`Your payment was **declined** - please update your payment method on Patreon and retry payment. https://support.patreon.com/hc/en-gb/articles/203913799-Retry-my-payment-decline-`);
                    response.push(``);
                    response.push(`If it is **before the 8th** and you have made a **successful payment**, your name will be automatically added to the VIP list **on the 8th**.`);
                    response.push(``);
                    response.push(`If it is **past the 8th**, please open a ticket via the #faq channel`);
                }
                
                if (!active) {
                    response.push(`You signed up **this month** - you will receive your in-world benefits starting from the **4th of next month**.`);
                }

                if (found?.VRChat) {
                    response.push(``);
                    response.push(`${emotes.VRChat} VRChat: **${found.VRChat || "No name on record"}**`);
                    response.push(`${emotes.Discord} Discord: **${user.tag}**`);
                    response.push(``);
                    response.push(`Need to change your VRChat name? Just run the **/vip name** command with your new VRChat display name`);
                }
            }
        }

        // ===
        // VIPNAME COMMAND
        // ===
        if (interaction.options.getSubcommand() === 'vip_name') {
            const newName = interaction.options.getString('vrchat_username').replaceAll(".", "․");
            const oldName = found?.VRChat;

            const newTier = interaction.options.getString('tier') ?? found.Tier;
            const newPatreonName = interaction.options.getString('name');

            if (foundIndex > -1) {
                patrons[foundIndex].VRChat = newName;
                patrons[foundIndex].Tier = newTier;

                if (newPatreonName) {
                    patrons[foundIndex].Name = newPatreonName;
                }
            } else {
                found = {
                    DiscordId: user.id,
                    Discord: user.tag,
                    VRChat: newName,
                    Tier: newTier
                };

                if (newName) {
                    found.Name = newPatreonName;
                }

                patrons.push(found)
            }

            fs.writeFileSync('./patrons/patrons.json', JSON.stringify(patrons, null, 2), 'utf8');          //Write to patrons.json

            const isActive = found.Name || tier === "VIP (Kofi)";


           // Form a response
            if (oldName == newName) {
                console.log(`Name unchanged ${newName}`);
                response.push(`Name unchanged!`);
                response.push(`${emotes[found.Tier]} **${newName}**`);
            } else if (!oldName) {
                console.log(`Added VRChat name: ${newName}`);
                response.push(`:white_check_mark: Added VRChat name **${newName}**`);
            } else {
                console.log(`VRChat name changed from ${oldName} to ${newName}`);
                response.push(`${emotes.VRChat} VRChat name changed from **${oldName}** to **${newName}**`);
            }

            if (declined) {
                response.push(`Your payment was **declined** - please update your payment method on Patreon and retry payment. https://support.patreon.com/hc/en-gb/articles/203913799-Retry-my-payment-decline-`);
                response.push(``);
                response.push(`If it is **before the 8th** and you have made a **successful payment**, your name will be automatically added to the VIP list **on the 8th**.`);
                response.push(``);
                response.push(`If it is **past the 8th**, please open a ticket via the #faq channel`);
            } else if (isActive && oldName !== newName) {
                response.push(``);
                response.push(`:alarm_clock: Your name will be updated on the VIP list in-world **within 60 minutes**.`);
                response.push(`Please **clear your in-game cache** to be sure to get the up-to-date VIP list :pray:`);
                response.push(``);
                response.push(`If you have waited for **at least 60 minutes** and still don't have access, please make sure to **copy and paste your VRChat Display Name** from the VRChat website`);
            } else if (isActive && oldName === newName) {
                response.push(`Please **clear your in-game cache** to be sure to get the up-to-date VIP list :pray:`);
            } else if (!isActive) {
                response.push(``);
                response.push(`Your in-world benefits will start on the 4th of next month :thumbsup:`);
            }
        }
        
        submitResponse(interaction, response);
    }
}