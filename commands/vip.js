const { SlashCommandBuilder } = require('@discordjs/builders');
const { Emoji } = require('discord.js');
const fs = require('fs');

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
        .setName('vip')
        .setDescription("Manage a user's VIP status.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('name')
                .setDescription('Change your VRChat name on the VIP list.')
                .addStringOption(option =>
                    option
                        .setName('vrchat_username')
                        .setDescription('The VRChat display name of the user to be added.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View info for a VIP user.')),
    async execute(interaction)
    {
        const patrons = JSON.parse(fs.readFileSync('./patrons/patrons.json', 'utf8'));
        const guildMember = interaction.member;
        const user = guildMember.user;
        const homeGuild = interaction.guild; 
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

        // See if we can match a Patron with an unlinked entry in patrons.json
        if (foundIndex == -1 && tier) {
            foundIndex = patrons.findIndex(patron => (
                !patron.Discord
                    && patron.VRChat == interaction.options.getString('vrchat_username')?.replaceAll(".", "․")));
        }

        var found = foundIndex > -1 ? patrons[foundIndex] : null;
        var active = found?.Name || hasKofiRole; 
        var declined = found?.Name === "DECLINED";

        if (foundIndex > -1) {
            console.log(`Found at index ${foundIndex}`);
            console.log(found);
            found.DiscordId = user.id; // Add their Discord ID for potential future use
            found.Discord = user.tag; // If they hadn't linked their Patreon before the list was created, this will pseudo link them (but will break at the start of next month if they didn't link)
        } else if (hasPatreonRole) {
            console.log(`User not found - but is a Patron`);
        } else if (hasKofiRole) {
            console.log(`User not found - but is a Kofi supporter`);
        } else {
            console.log(`User not found`);
            response.push(`Your **Discord** account is **not linked** to a **Patreon** account on record.`);
            response.push(`**If** you have signed up to the **Patreon** at VIP tier or above, please **link your Discord account on Patreon** and **then** open a ticket using **!ticket**`);
            submitResponse(interaction, response);
            return;
        }

        // ===
        // INFO COMMAND
        // ===
        if (interaction.options.getSubcommand() === 'info')
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
        // NAME COMMAND
        // ===
        if (interaction.options.getSubcommand() === 'name')
        {
            const newName = interaction.options.getString('vrchat_username').replaceAll(".", "․");
            const oldName = found?.VRChat;

            if (foundIndex > -1) {
                patrons[foundIndex].VRChat = newName;
            } else {
                found = {
                    DiscordId: user.id,
                    Discord: user.tag,
                    VRChat: newName,
                    Tier: tier
                };

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
                response.push(`Your VIP is **active**! Please **clear your in-game cache** to be sure to get the up-to-date VIP list :pray:`);
            } else if (!isActive && found.Tier == "VIP (Kofi)") {
                response.push(``);
                response.push(`Records indicate that you are a **Kofi VIP but do not have the discord role** - please link your Discord to your Ko-fi account, or check that your last payment was successful`);
            } else {
                response.push(``);
                response.push(`Your in-world benefits will start on the 4th of next month :thumbsup:`); 
            }
        }

        submitResponse(interaction, response);
    },
};