const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");
const shopItems = require("../shopItems.json");
const shopPrices = require("../shopPrices.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purchase-role")
    .setDescription("Purchase a colour role from the shop")
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("Name of the role to purchase")
        .setRequired(true)
    ),

  async execute(interaction) {
    const roleNameInput = interaction.options.getString("role").toLowerCase();
    const guild = interaction.guild;

    // Find the role in shopItems.json
    let foundRole = null;
    let tierCost = 0;
    let tierKey = null;

    for (const [tier, tierData] of Object.entries(shopItems.tiers)) {
      const role = tierData.roles.find(
        (r) => r.name.toLowerCase() === roleNameInput
      );
      if (role) {
        foundRole = role;
        tierCost = tierData.cost; // cost is stored on the tier level
        tierKey = tier;
        break;
      }
    }

    if (!foundRole) {
      return interaction.reply({
        content: `❌ That role does not exist in the shop.`,
        ephemeral: true,
      });
    }

    // Check if role exists in the server
    const roleInGuild = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === foundRole.roleName.toLowerCase()
    );
    if (!roleInGuild) {
      return interaction.reply({
        content: `❌ The role **${foundRole.roleName}** exists in the shop but not on this server. Please contact an admin.`,
        ephemeral: true,
      });
    }

    // Get user profile or create it if doesn't exist
    let profile = await profileModel.findOne({
      userId: interaction.user.id,
      serverId: guild.id,
    });

    if (!profile) {
      profile = new profileModel({
        userId: interaction.user.id,
        serverId: guild.id,
        balance: 0,
        inventory: [],
      });
    }

    // Check if user already owns this role
    if (profile.inventory.includes(roleInGuild.id)) {
      return interaction.reply({
        content: `❌ You already own the role **${foundRole.name}**.`,
        ephemeral: true,
      });
    }

    // Check if user has enough coins
    if (profile.balance < tierCost) {
      return interaction.reply({
        content: `❌ You need **${tierCost}** coins to buy **${foundRole.name}**, but you only have **${profile.balance}**.`,
        ephemeral: true,
      });
    }

    // Deduct coins and add role ID to inventory
    profile.balance -= tierCost;
    profile.inventory.push(roleInGuild.id);
    await profile.save();

    return interaction.reply({
      content: `✅ You have successfully purchased the role **${foundRole.name}** for **${tierCost}** coins! Use the equip command to wear it.`,
      ephemeral: true,
    });
  },
};
