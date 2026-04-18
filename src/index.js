const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Partials,
    AttachmentBuilder
} = require('discord.js');
require('dotenv').config();
const path = require('path'); // Importamos path para manejar rutas

// --- SOLUCIÓN AL ERROR DE MÓDULO ---
// Usamos path.join y __dirname para asegurar que encuentre el archivo en la raíz
const config = {
    canalReglas: process.env.CANAL_REGLAS,
    rolMiembro: process.env.ROL_MIEMBRO,
    canalLogs: process.env.CANAL_LOGS,
    canalBienvenida: process.env.CANAL_BIENVENIDA,
    rolesExentos: process.env.ROLES_EXENTOS ? process.env.ROLES_EXENTOS.split(',') : [],
    rolesJuegos: {
        valorant: process.env.ROL_VALORANT,
        lol: process.env.ROL_LOL,
        tft: process.env.ROL_TFT,
        dbd: process.env.ROL_DBD,
        roblox: process.env.ROL_ROBLOX
    }
};

const { createCanvas, loadImage } = require('canvas');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --- CONFIGURACIÓN VISUAL ---
const COLORS = {
    SUCCESS: 0x2ECC71,
    ERROR: 0xED4245,
    NEUTRAL: 0x2F3136,
    INFO: 0x5865F2
};

client.once('ready', () => {
    console.log(`
    -------------------------------------------
    ✅ GESTOR DE ROLES Y SEGURIDAD INICIADO
    🤖 Bot: ${client.user.tag}
    -------------------------------------------
    `);
});

/**
 * EVENTO: guildMemberAdd
 * Bienvenida visual y logs de entrada.
 */
client.on('guildMemberAdd', async (member) => {
    const canalBienvenida = member.guild.channels.cache.get(config.canalBienvenida);
    const canalLogs = member.guild.channels.cache.get(config.canalLogs);

    if (canalLogs) {
        canalLogs.send({ content: `📥 **Entrada**: ${member.user.tag} (ID: ${member.user.id})` });
    }

    if (!canalBienvenida) return;

    try {
        const canvas = createCanvas(700, 250);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#23272A'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#5865F2';
        ctx.lineWidth = 8;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

        ctx.font = '35px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('¡BIENVENIDO/A!', 250, 100);

        ctx.font = '50px sans-serif';
        ctx.fillStyle = '#5865F2';
        ctx.fillText(member.user.username, 250, 170);

        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, 45, 45, 160, 160);
        ctx.restore();

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🎉 ¡Hola ${member.user.username}!`)
            .setDescription(`Bienvenido/a al servidor. Pásate por <#${config.canalReglas}> para obtener acceso total.`)
            .setImage('attachment://welcome.png')
            .setColor(COLORS.INFO);

        await canalBienvenida.send({ embeds: [embed], files: [attachment] });
    } catch (error) {
        console.error("Error en imagen de bienvenida:", error);
    }
});

/**
 * EVENTO: guildMemberRemove
 * Registro de salida.
 */
client.on('guildMemberRemove', async (member) => {
    const canalLogs = member.guild.channels.cache.get(config.canalLogs);
    if (!canalLogs) return;

    const estadia = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Miembro ha salido`, iconURL: member.user.displayAvatarURL() })
        .setDescription(`❌ **${member.user.tag}** abandonó el servidor.`)
        .addFields(
            { name: 'ID', value: `\`${member.user.id}\``, inline: true },
            { name: 'Estadía', value: `${estadia} días`, inline: true },
            { name: 'Roles', value: member.roles.cache.map(r => r.name).filter(n => n !== '@everyone').join(', ') || 'Ninguno' }
        )
        .setColor(COLORS.ERROR)
        .setTimestamp();

    await canalLogs.send({ embeds: [embed] });
});

/**
 * EVENTO: messageCreate
 * Comandos administrativos y Auto-Mod con Whitelist.
 */
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. COMANDO SETUP VERIFICACIÓN
    if (message.content === '!setup-verificacion' && message.member.permissions.has('Administrator')) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Verificación de Seguridad')
            .setDescription('Bienvenido. Para acceder al resto del servidor, acepta las normas presionando el botón.')
            .setColor(COLORS.NEUTRAL);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('verificar_usuario').setLabel('Verificarme').setEmoji('✅').setStyle(ButtonStyle.Success)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        return message.delete().catch(() => {});
    }

    // 2. COMANDO SETUP AUTO-ROLES
    if (message.content === '!setup-roles' && message.member.permissions.has('Administrator')) {
        const embed = new EmbedBuilder()
            .setTitle('🎮 Selección de Juegos')
            .setDescription('Haz clic en los botones para elegir tus juegos y recibir notificaciones.')
            .setColor(COLORS.INFO);

        const fila1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('role_valorant').setLabel('VALORANT').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
            new ButtonBuilder().setCustomId('role_lol').setLabel('LOL').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
            new ButtonBuilder().setCustomId('role_tft').setLabel('TFT').setStyle(ButtonStyle.Primary).setEmoji('♟️'),
            new ButtonBuilder().setCustomId('role_dbd').setLabel('DBD').setStyle(ButtonStyle.Primary).setEmoji('🔦'),
            new ButtonBuilder().setCustomId('role_roblox').setLabel('ROBLOX').setStyle(ButtonStyle.Primary).setEmoji('🧱')
        );

        await message.channel.send({ embeds: [embed], components: [fila1] });
        return message.delete().catch(() => {});
    }

    // 3. AUTO-MOD MEJORADO (Whitelist)
    const esCanalReglas = message.channel.id === config.canalReglas;
    const tieneRolVerificado = message.member.roles.cache.has(config.rolMiembro);
    const esStaff = message.member.permissions.has('Administrator') || message.member.permissions.has('ManageMessages');
    
    const esExento = config.rolesExentos?.some(id => message.member.roles.cache.has(id));

    if (!esCanalReglas && !tieneRolVerificado && !esStaff && !esExento) {
        try {
            await message.delete();
            return message.author.send(`⚠️ Debes verificarte en el canal de reglas de **${message.guild.name}** antes de hablar.`).catch(() => {});
        } catch (error) {
            console.error("Error en Auto-Mod:", error);
        }
    }
});

/**
 * EVENTO: interactionCreate
 */
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, member, guild, user } = interaction;
    const canalLogs = guild.channels.cache.get(config.canalLogs);

    if (customId === 'verificar_usuario') {
        const rolV = guild.roles.cache.get(config.rolMiembro);
        if (!rolV) return interaction.reply({ content: '❌ Rol no configurado.', ephemeral: true });

        if (member.roles.cache.has(config.rolMiembro)) {
            return interaction.reply({ content: '💡 Ya estás verificado.', ephemeral: true });
        }

        try {
            await member.roles.add(rolV);
            await interaction.reply({ content: '✅ Verificación exitosa.', ephemeral: true });

            if (canalLogs) {
                const embedLog = new EmbedBuilder()
                    .setTitle('📥 Nueva Verificación')
                    .setColor(COLORS.SUCCESS)
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        { name: 'Usuario', value: `${user.tag}`, inline: true },
                        { name: 'ID', value: `\`${user.id}\``, inline: true },
                        { name: 'Ingreso', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();
                await canalLogs.send({ embeds: [embedLog] });
            }
        } catch (e) {
            console.error(e);
            await interaction.reply({ content: '❌ Error al asignar rol. Revisa jerarquía.', ephemeral: true });
        }
    }

    if (customId.startsWith('role_')) {
        const juego = customId.split('_')[1];
        const rolId = config.rolesJuegos[juego];
        const rolJ = guild.roles.cache.get(rolId);

        if (!rolJ) return interaction.reply({ content: '❌ Rol de juego no configurado.', ephemeral: true });

        try {
            if (member.roles.cache.has(rolId)) {
                await member.roles.remove(rolJ);
                await interaction.reply({ content: `➖ Rol **${rolJ.name}** quitado.`, ephemeral: true });
            } else {
                await member.roles.add(rolJ);
                await interaction.reply({ content: `➕ Rol **${rolJ.name}** asignado.`, ephemeral: true });
            }
        } catch (e) {
            await interaction.reply({ content: '❌ Error al gestionar rol.', ephemeral: true });
        }
    }
});

process.on('unhandledRejection', error => {
    console.error('❌ Error no manejado (Promesa):', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Error no manejado (Excepción):', error);
});

const TOKEN = process.env.DISCORD_TOKEN || config.token;
client.login(TOKEN);