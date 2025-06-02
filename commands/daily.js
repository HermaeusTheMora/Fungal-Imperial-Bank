const { SlashCommandBuilder } = require("discord.js");
const parseMilliseconds = require("parse-ms-2");
const profileModel = require("../models/profileSchema");
const { dailyMin, dailyMax } = require("../globalValues.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Redeem your free daily coins!"),
  async execute(interaction, profileData) {
    const { id } = interaction.user;
    const { dailyLastUsed } = profileData;

    const cooldown = 86400000;
    const timeLeft = cooldown - (Date.now() - dailyLastUsed);

    if (timeLeft > 0) {
      await interaction.deferReply({ ephemeral: true });
      const { hours, minutes, seconds } = parseMilliseconds(timeLeft);
      await interaction.editReply(
        `Claim your next daily in ${hours} hrs ${minutes} mins ${seconds} secs`
      );
      return;
    }

    await interaction.deferReply();

    const now = new Date();
    const lastClaim = new Date(profileData.lastClaimDate || 0);
    const diffDays = Math.floor((now - lastClaim) / (1000 * 60 * 60 * 24));

    let streak = profileData.dailyStreak || 0;

    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }

    // Apply streak multiplier (capped at x5)
    const multiplier = Math.min(streak, 5);

    let randomAmt = Math.floor(
      Math.random() * (dailyMax - dailyMin + 1) + dailyMin
    );
    randomAmt *= multiplier;

    const jackpotChance = 0.05; // 5% chance
    const jackpotBonus = randomAmt * 2;
    let jackpotText = "";

    if (Math.random() < jackpotChance) {
      jackpotText = ` 🎉 **JACKPOT!** You won an **extra** ${jackpotBonus} coins!`;
    }

    try {
      await profileModel.findOneAndUpdate(
        { userId: id },
        {
          $set: {
            dailyLastUsed: Date.now(),
            lastClaimDate: now,
            dailyStreak: streak,
          },
          $inc: {
            balance: randomAmt,
            balance: randomAmt + (jackpotText ? jackpotBonus : 0),
          },
        }
      );
    } catch (err) {
      console.log(err);
    }

    const flavourTexts = [
      `You found a hidden stash of coins!`,
      `The gods of money smile upon you today!`,
      `The daily grind pays off!`,
      `The universe owes you this.`,
      `You accidentally walked into a treasure chest.`,
      `You mugged an innocent grandma!`,
      `You must be a landlord the way you're ripping off poor people today!`,
    ];
    const flavourText =
      flavourTexts[Math.floor(Math.random() * flavourTexts.length)];

    await interaction.editReply(
      `${flavourText} You collected ${randomAmt} coins!${jackpotText}`
    );
  },
};
