const { token, oid } = require('./config.json');
const fs = require('fs');
const sql = require('sequelize');
const axios = require('axios');
const { Client, Collection, Intents, MessageEmbed, MessageAttachment } = require('discord.js');
const config = require('./config.json');
const { omikuji } = require('./modules/utility');
const botzoneDB = require('./modules/dbFunction/botChannel');
const logging = require('./modules/dbFunction/log');
const client = new Client({ partials:["CHANNEL", "MESSAGE", "USER"], intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./cmds/${file}`);
  client.commands.set(command.data.name, command);
}

const sequelize = new sql('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  storage: 'database.sqlite',
});

const botzone = require('./modules/dbStructure/botChannel')(sequelize, sql.DataTypes);
const log = require('./modules/dbStructure/log')(sequelize, sql.DataTypes);

client.once('ready', () => {
  const now = new Date();
  const time = now.toTimeString();
  console.log(`${time}`);

  botzone.sync();
  log.sync();

  console.log(`以 ${client.user.tag} 登入`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: `指令出錯，請洽 <@${oid}>`, ephemeral: true });
  }

});

client.on('messageDelete', async msg => {
  const Obj = new logging.log;
  if (msg.attachments.size > 0) {
    if (await Obj.findLogChannel(msg.guildId)) {

      const embed = new MessageEmbed().setColor('GREEN').setTitle(`附件刪除 #${msg.channel.name}`).setDescription(msg.author.tag);
      if (msg.content) {
        embed.addFields({name: '訊息內容', value: `${msg.content}`, inline: false});
      }
      const logChannel = client.channels.cache.get(await Obj.logChannelId(msg.guildId));

      msg.attachments.forEach(async a => {
        const url = a.url;
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const buff = Buffer.from(response.data, "base64");
        const file = new MessageAttachment(buff);
        logChannel.send({ files: [file] });
      });
      await logChannel.send({ embeds:[embed] });
    } else { return; };
  } else {
    if (await Obj.findLogChannel(msg.guildId)) {

      const embed = new MessageEmbed().setColor('GREEN').setTitle(`訊息刪除 #${msg.channel.name}`).setDescription(msg.author.tag);
      if (msg.content) {
        embed.addFields({name: '訊息內容', value: `${msg.content}`, inline: false});
      }
      const logChannel = client.channels.cache.get(await Obj.logChannelId(msg.guildId));
      await logChannel.send({ embeds:[embed] });
    } else { return; };
  }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  const Obj = new logging.log;
  if (await Obj.findLogChannel(msg.guildId)) {
    const embed = new MessageEmbed().setColor('DARK_GREEN').setTitle(`訊息編輯 #${oldMessage.channel.name}`).setDescription(oldMessage.author.tag);
    if (oldMessage.content) {
      embed.addFields({name: '舊訊息', value: `${oldMessage.content}`, inline: false},{name: '新訊息', value: `${newMessage.content}`, inline: false});
    } else {
      embed.addFields({name: '舊訊息', value: '`'+'nothing'+'`', inline: false},{name: '新訊息', value: `${newMessage.content}`, inline: false});
    }
  } else { return; };
})

client.on('messageCreate', async msg => {

  if (msg.author.bot) return;
  const Obj = new botzoneDB.botzone(msg.channel.id);
  // 監控
  if (msg.channel.type === 'DM') {
    if (msg.author.id === config.oid) return;
    const embed1 = new MessageEmbed()
      .setColor('#c5c6c9')
      .setTitle(`來自 ${msg.author.tag} (${msg.author.id})的訊息`)
      .setDescription(`<@${msg.author.id}>\n` + msg.content)
      .setFooter({ text:`來信時間 : ${msg.createdAt.toLocaleDateString()} ${msg.createdAt.toLocaleTimeString()}` });

    if (msg.attachments.size > 0) {
      msg.attachments.forEach(a => {
        const url = a.url;
        embed1.setImage(url);
      });
    }
    client.users.fetch(config.oid).then((owner) =>
      owner.send({ embeds:[embed1] })
    );
  } else if (msg.content.includes('抽籤') && await Obj.findChannel(msg.channelId)) {
    omikuji(msg);
  }
});

client.login(token);
