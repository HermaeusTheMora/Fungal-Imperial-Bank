const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("@discordjs/builders");
const profileModel = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Shows the leaderboard"),
  async execute(interaction, profileData) {
    await interaction.deferReply();

    const { username, id } = interaction.user;
    const { balance } = profileData;

    let leaderboardEmbed = new EmbedBuilder()
      .setTitle("**Top 10 Coin Earners**")
      .setColor(0x45d6fd)
      .setFooter({ text: "You are not ranked yet" });

    const members = await profileModel
      .find()
      .sort({ balance: -1 })
      .catch((err) => console.log(err));

    const memberIdx = members.findIndex((member) => member.userId === id);
    if (memberIdx === 0) {
      leaderboardEmbed.setTitle(
        "**👑 Top 10 Coin Earners - Long live your Tycoon! 👑**"
      );
    }
    leaderboardEmbed.setFooter({
      text: `${username}, you're rank #${memberIdx + 1} with ${balance} Coins`,
    });

    const topTen = members.slice(0, 10);

    let desc = "";
    for (let i = 0; i < topTen.length; i++) {
      let { user } = await interaction.guild.members.fetch(topTen[i].userId);
      if (!user) return;
      let userBalance = topTen[i].balance;
      const rankIcons = ["🥇", "🥈", "🥉"];
      const rankLabel = i < 3 ? rankIcons[i] : `${i + 1}.`;
      desc += `**${rankLabel}** ${
        user.username
      }: ${userBalance.toLocaleString()} Coins\n`;
      if (members.length < 3) {
        desc += `\n\n*No one else is rich enough to be listed... yet.*`;
      }
      if (members.length > 3 && members.length < 5) {
        desc += `\n\n*Not many stand atop the podium... rally your comrades and challenge this fragile elite.*`;
      }
    }
    if (desc !== "") {
      leaderboardEmbed.setDescription(desc);
    }

    await interaction.editReply({ embeds: [leaderboardEmbed] });
  },
};
