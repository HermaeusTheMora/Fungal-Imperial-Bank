const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const shopItems = require("../shopItems.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View the shop of colour roles"),
  async execute(interaction) {
    let page = 1;
    const tiers = shopItems.tiers;
    const maxPage = Object.keys(tiers).length;

    function generateEmbed(pageNum) {
      const tier = tiers[pageNum];
      if (!tier) return null;

      const embed = new EmbedBuilder()
        .setTitle(`Shop - ${tier.name}`)
        .setDescription(
          tier.roles
            .map(
              (r) =>
                `${r.emoji ? r.emoji + " " : ""}**${r.name}** - Cost: $${
                  tier.cost
                }`
            )
            .join("\n") || "No roles in this tier."
        )
        .setFooter({ text: `Page ${pageNum} of ${maxPage}` });

      return embed;
    }

    // Create buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === maxPage)
    );

    // Send initial reply
    const message = await interaction.reply({
      embeds: [generateEmbed(page)],
      components: [row],
      fetchReply: true,
      ephemeral: true, // optional: user-only visibility
    });

    // Collector to handle buttons
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "next") {
        page = Math.min(page + 1, maxPage);
      } else if (i.customId === "prev") {
        page = Math.max(page - 1, 1);
      }

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === maxPage)
      );

      await i.update({
        embeds: [generateEmbed(page)],
        components: [newRow],
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );

      await interaction.editReply({ components: [disabledRow] });
    });
  },
};
