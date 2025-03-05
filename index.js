require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    EmbedBuilder,
} = require("discord.js");
const { REST } = require("@discordjs/rest");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const TOKEN =
    "";
const CLIENT_ID = ""; // ID vašeho bota
const GUILD_ID = ""; // ID serveru
const ROLE_ID = ""; // ID role, kterou chcete přidat
const CHANNEL_ID = ""; // ID kanálu pro oznámení
const LOG_CHANNEL_ID = ""; // ID kanálu pro logování
const BLACKLIST_ROOM = ""; // New constant for the blacklist channel

// Register Commands
const commands = [
    new SlashCommandBuilder()
        .setName("addwl")
        .setDescription(
            "Přidá uživateli whitelist roli a pošle oznámení do specifikovaného kanálu a PM.",
        )
        .addUserOption((option) =>
            option
                .setName("uživatel")
                .setDescription(
                    "Vyber uživatele, kterému chcete přidat whitelist roli.",
                )
                .setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Zabanuje uživatele.")
        .addUserOption((option) =>
            option
                .setName("uživatel")
                .setDescription("Vyber uživatele, kterého chcete zabanovat.")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("důvod")
                .setDescription("Důvod banu.")
                .setRequired(false),
        ),
    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Odbanuje uživatele podle jeho ID.")
        .addStringOption((option) =>
            option
                .setName("user_id")
                .setDescription("ID uživatele, kterého chcete odbanovat.")
                .setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName("accountage")
        .setDescription(
            "Zjistí, jak starý je účet v letech, měsících a hodinách.",
        )
        .addUserOption((option) =>
            option
                .setName("uživatel")
                .setDescription(
                    "Vyberte uživatele, jehož věk účtu chcete zjistit.",
                )
                .setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName("blacklist")
        .setDescription("Přidá uživatele na blacklist s důvodem.")
        .addUserOption((option) =>
            option
                .setName("uživatel")
                .setDescription(
                    "Vyber uživatele, kterého chcete přidat na blacklist.",
                )
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("důvod")
                .setDescription("Důvod pro přidání na blacklist.")
                .setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName("sprava")
        .setDescription("Vytvoří vlastní zprávu embed.")
        .addStringOption((option) =>
            option
                .setName("title")
                .setDescription("Nadpis zprávy.")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("description")
                .setDescription("Popis zprávy.")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName("color")
                .setDescription("Hex barva embedu. (Např. #FF5733)"),
        )
        .addStringOption((option) =>
            option
                .setName("thumbnail")
                .setDescription("URL obrázku pro thumbnail."),
        )
        .addStringOption((option) =>
            option
                .setName("footer")
                .setDescription("Text pro spodní část embedu."),
        ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("Registrace příkazů...");
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
            body: commands,
        });
        console.log("Příkazy úspěšně registrovány.");
    } catch (error) {
        console.error("Chyba při registraci příkazů:", error);
    }
})();

client.once("ready", () => {
    console.log(`Přihlášen jako ${client.user.tag}`);
});

// Function to handle add whitelist command
async function handleAddWhitelist(interaction) {
    try {
        const user = interaction.options.getUser("uživatel");
        const member = await interaction.guild.members.fetch(user.id);
        const role = interaction.guild.roles.cache.get(ROLE_ID);
        const channel = interaction.guild.channels.cache.get(CHANNEL_ID);
        const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        const commandUser = interaction.user;

        if (!role || !channel) {
            return interaction.reply({
                content: "Role nebo kanál nebyl nalezen.",
                ephemeral: true,
            });
        }

        await member.roles.add(role);

        const embed = new EmbedBuilder()
            .setColor("#9b59b6")
            .setTitle("Výsledek pohovoru Natural RolePlay")
            .setDescription(
                `**Gratulujeme,** <@${user.id}>! Právě jste **ÚSPĚŠNĚ** prošli whitelist pohovorem! Pohovor vedl člen ${commandUser.tag}.`,
            )
            .addFields({
                name: "Příkaz použil:",
                value: `${commandUser.tag}`,
                inline: false,
            })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        try {
            await member.send({ embeds: [embed] });
        } catch (error) {
            if (error.code === 50007) {
                console.log(
                    `Nelze odeslat PM uživateli ${user.tag}, DMs jsou zakázané.`,
                );
                logChannel?.send(
                    `Uživatel ${user.tag} má zakázané soukromé zprávy, PM nebyla odeslána.`,
                );
            } else {
                console.error("Neočekávaná chyba při odesílání PM:", error);
            }
        }

        interaction.reply({
            content: `Whitelist role úspěšně přidána uživateli ${user.tag}. Oznámení odesláno do kanálu a PM.`,
        });
    } catch (error) {
        console.error("Chyba v příkazu addwl:", error);
        interaction.reply({
            content: "Došlo k chybě při přidávání whitelist role.",
        });
    }
}

// Function to handle blacklist command
async function handleBlacklist(interaction) {
    const user = interaction.options.getUser("uživatel");
    const reason = interaction.options.getString("důvod");
    const blacklistChannel =
        interaction.guild.channels.cache.get(BLACKLIST_ROOM);
    const commandUser = interaction.user;

    const embed = new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("BLACKLIST")
        .setDescription(
            `Uživatel <@${user.id}> byl přidán na blacklist z důvodu: ${reason}`,
        )
        .addFields({
            name: "Autor:",
            value: `${commandUser.tag}`,
            inline: false,
        })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    if (blacklistChannel) {
        await blacklistChannel.send({ embeds: [embed] });
    } else {
        console.error("Blacklist kanál nebyl nalezen.");
    }

    interaction.reply({
        content: `Uživatel ${user.tag} byl úspěšně přidán na blacklist.`,
    });
}

// Function to handle custom /sprava embed command
async function handleSprava(interaction) {
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const color = interaction.options.getString("color") || "#5865F2";
    const thumbnail = interaction.options.getString("thumbnail");
    const footer = interaction.options.getString("footer");

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (footer) embed.setFooter({ text: footer });

    await interaction.reply({ embeds: [embed] });
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case "addwl":
            await handleAddWhitelist(interaction);
            break;
        case "ban":
            // Implement ban logic here
            break;
        case "unban":
            // Implement unban logic here
            break;
        case "accountage":
            // Implement account age logic here
            break;
        case "blacklist":
            await handleBlacklist(interaction);
            break;
        case "sprava":
            await handleSprava(interaction);
            break;
    }
});

client.login(TOKEN);
