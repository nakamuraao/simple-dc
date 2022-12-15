const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('產生邀請連結'),

  async execute(interaction) {
    const embed = new MessageEmbed().setColor('WHITE').setDescription('https://discord.com/api/oauth2/authorize?client_id=1052909339758829649&permissions=8&scope=bot%20applications.commands');
    await interaction.reply({ embeds:[embed] });
  }

};
