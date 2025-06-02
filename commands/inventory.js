const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const profileModel = require("../models/profileSchema");
const shopItems = require("../shopItems.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your purchased colour roles"),

  async execute(interaction) {
    const guild = interaction.guild;
    const userId = interaction.user.id;

    // Fetch user profile
    const profile = await profileModel.findOne({
      userId,
      serverId: guild.id,
    });

    if (!profile || !profile.inventory || profile.inventory.length === 0) {
      return interaction.reply({
        content: "❌ You have no purchased roles in your inventory.",
        ephemeral: true,
      });
    }

    // Map of tierKey => roles user owns in that tier
    const userRolesByTier = {};

    // For quick role ID lookup in guild
    const guildRoles = guild.roles.cache;

    // Check each tier and gather roles user owns in them
    for (const [tierKey, tierData] of Object.entries(shopItems.tiers)) {
      // Filter roles user owns in inventory for this tier
      const ownedRoles = tierData.roles.filter((shopRole) => {
        // Find role ID from guild matching roleName
        const guildRole = guildRoles.find(
          (r) => r.name.toLowerCase() === shopRole.roleName.toLowerCase()
        );
        if (!guildRole) return false; // role doesn't exist on server

        // Check if user owns this role by role ID
        return profile.inventory.includes(guildRole.id);
      });

      if (ownedRoles.length > 0) {
        userRolesByTier[tierKey] = {
          name: tierData.name,
          roles: ownedRoles,
          cost: tierData.cost, // not necessarily needed here but keeping consistent
        };
      }
    }

    const tiersWithRoles = Object.keys(userRolesByTier);
    if (tiersWithRoles.length === 0) {
      return interaction.reply({
        content: "❌ You have no purchased roles from any tier.",
        ephemeral: true,
      });
    }

    let page = 1;
    const maxPage = tiersWithRoles.length;

    function generateEmbed(pageNum) {
      const tierKey = tiersWithRoles[pageNum - 1];
      const tierData = userRolesByTier[tierKey];

      const embed = new EmbedBuilder()
        .setTitle(`Your Inventory - ${tierData.name}`)
        .setDescription(
          tierData.roles
            .map((r) => `${r.emoji ? r.emoji + " " : ""}**${r.name}**`)
            .join("\n") || "No roles in this tier."
        )
        .setFooter({ text: `Page ${pageNum} of ${maxPage}` });

      return embed;
    }

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

    const message = await interaction.reply({
      embeds: [generateEmbed(page)],
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i) => i.user.id === userId,
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
