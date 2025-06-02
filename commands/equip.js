const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");
const shopItems = require("../shopItems.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("equip")
    .setDescription("Equip a colour role you own")
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("Name of the role to equip")
        .setRequired(true)
    ),

  async execute(interaction) {
    const roleNameInput = interaction.options.getString("role").toLowerCase();
    const guild = interaction.guild;
    const member = interaction.member;

    // Find role in shopItems (to validate)
    let foundRole = null;
    for (const tierData of Object.values(shopItems.tiers)) {
      const role = tierData.roles.find(
        (r) => r.name.toLowerCase() === roleNameInput
      );
      if (role) {
        foundRole = role;
        break;
      }
    }

    if (!foundRole) {
      return interaction.reply({
        content: `❌ That role does not exist in the shop.`,
        ephemeral: true,
      });
    }

    // Get the actual Discord role object by name
    const roleInGuild = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === foundRole.roleName.toLowerCase()
    );

    if (!roleInGuild) {
      return interaction.reply({
        content: `❌ The role **${foundRole.roleName}** exists in the shop but not on this server. Contact an admin.`,
        ephemeral: true,
      });
    }

    // Get user profile
    let profile = await profileModel.findOne({
      userId: interaction.user.id,
      serverId: guild.id,
    });

    if (!profile || !profile.inventory.includes(roleInGuild.id)) {
      return interaction.reply({
        content: `❌ You do not own the role **${foundRole.name}**.`,
        ephemeral: true,
      });
    }

    // Find currently equipped roles (roles from inventory that member has)
    const currentlyEquipped = profile.inventory.filter((roleId) =>
      member.roles.cache.has(roleId)
    );

    // Remove any currently equipped roles
    try {
      if (currentlyEquipped.length > 0) {
        await member.roles.remove(currentlyEquipped);
      }
      // Add the new role
      await member.roles.add(roleInGuild);

      return interaction.reply({
        content: `✅ You have equipped the role **${foundRole.name}**.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error equipping role:", error);
      return interaction.reply({
        content: `❌ There was an error while trying to equip the role.`,
        ephemeral: true,
      });
    }
  },
};
