const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");
const shopItems = require("../shopItems.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unequip")
    .setDescription("Unequip your currently equipped colour role"),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;

    // Get user profile
    let profile = await profileModel.findOne({
      userId: interaction.user.id,
      serverId: guild.id,
    });

    if (!profile) {
      return interaction.reply({
        content: `❌ You don't have any roles equipped.`,
        ephemeral: true,
      });
    }

    // Find equipped roles
    const currentlyEquipped = profile.inventory.filter((roleId) =>
      member.roles.cache.has(roleId)
    );

    if (currentlyEquipped.length === 0) {
      return interaction.reply({
        content: `❌ You don't have any roles equipped.`,
        ephemeral: true,
      });
    }

    try {
      await member.roles.remove(currentlyEquipped);

      return interaction.reply({
        content: `✅ You have unequipped your colour role(s).`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error unequipping role:", error);
      return interaction.reply({
        content: `❌ There was an error while trying to unequip the role.`,
        ephemeral: true,
      });
    }
  },
};
