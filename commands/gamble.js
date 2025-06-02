const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("@discordjs/builders");
const profileModel = require("../models/profileSchema");

function getRandomCard() {
  // Blackjack random card function
  const ranks = [
    { rank: "2", value: 2 },
    { rank: "3", value: 3 },
    { rank: "4", value: 4 },
    { rank: "5", value: 5 },
    { rank: "6", value: 6 },
    { rank: "7", value: 7 },
    { rank: "8", value: 8 },
    { rank: "9", value: 9 },
    { rank: "10", value: 10 },
    { rank: "J", value: 10 },
    { rank: "Q", value: 10 },
    { rank: "K", value: 10 },
    { rank: "A", value: 11 }, // Ace counted as 11 initially
  ];
  return ranks[Math.floor(Math.random() * ranks.length)];
}

function calculateHandValue(cards) {
  // Blackjack hand calculator
  let total = cards.reduce((acc, c) => acc + c.value, 0);
  let aces = cards.filter((c) => c.rank === "A").length;

  // If bust and have aces counted as 11, convert them to 1 (subtract 10)
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Gamble with your coins!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("three-doors")
        .setDescription(
          "Get the chance to double your coins by picking the lucky door!"
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Choose your wager want to gamble")
            .setMaxValue(100)
            .setMinValue(2)
            .setRequired(true)
        )
    ) // Three-Doors
    .addSubcommand((subcommand) =>
      subcommand
        .setName("blackjack")
        .setDescription(
          "Try to get your hand as close to 21 as possible without going above!"
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Choose your wager want to gamble")
            .setMaxValue(200)
            .setMinValue(10)
            .setRequired(true)
        )
    ), // Blackjack
  async execute(interaction, profileData) {
    const { username, id } = interaction.user;
    const { balance } = profileData;

    const gambleCommand = interaction.options.getSubcommand();

    const gambleEmbed = new EmbedBuilder().setColor(0x00aa6d);

    if (gambleCommand === "three-doors") {
      const amount = interaction.options.getInteger("amount");

      if (balance < amount) {
        await interaction.deferReply({ ephemeral: true });
        return await interaction.editReply(
          `You don't have ${amount} coins to gamble with`
        );
      }

      await interaction.deferReply();

      const Button1 = new ButtonBuilder()
        .setCustomId("one")
        .setLabel("Door 1")
        .setStyle(ButtonStyle.Primary);

      const Button2 = new ButtonBuilder()
        .setCustomId("two")
        .setLabel("Door 2")
        .setStyle(ButtonStyle.Primary);

      const Button3 = new ButtonBuilder()
        .setCustomId("three")
        .setLabel("Door 3")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(
        Button1,
        Button2,
        Button3
      );

      gambleEmbed
        .setTitle(`Playing three doors for ${amount} coins`)
        .setFooter({
          text: "Each door has **DOUBLE COINS**, **LOSE HALF**, or **LOSE ALL**",
        });

      await interaction.editReply({ embeds: [gambleEmbed], components: [row] });

      // Gather the message we sent above
      const message = await interaction.fetchReply();

      const filter = (i) => i.user.id === interaction.user.id;

      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      const double = "DOUBLE COINS";
      const half = "LOSE HALF";
      const lose = "LOSE ALL";

      const getAmount = (label, gamble) => {
        let amount = -gamble;
        if (label === double) {
          amount = gamble;
        } else if (label === half) {
          amount = -Math.round(gamble / 2);
        }
        return amount;
      };

      let choice = null;

      collector.on("collect", async (i) => {
        let options = [Button1, Button2, Button3];

        const randIdxDouble = Math.floor(Math.random() * 3);
        const doubleButton = options.splice(randIdxDouble, 1)[0];
        doubleButton.setLabel(double).setDisabled(true);

        const randIdxHalf = Math.floor(Math.random() * 2);
        const halfButton = options.splice(randIdxHalf, 1)[0];
        halfButton.setLabel(half).setDisabled(true);

        const zeroButton = options[0];
        zeroButton.setLabel(lose).setDisabled(true);

        Button1.setStyle(ButtonStyle.Secondary);
        Button2.setStyle(ButtonStyle.Secondary);
        Button3.setStyle(ButtonStyle.Secondary);

        if (i.customId === "one") choice = Button1;
        else if (i.customId === "two") choice = Button2;
        else if (i.customId === "three") choice = Button3;

        choice.setStyle(ButtonStyle.Success);

        const label = choice.data.label;
        const amtChange = getAmount(label, amount);

        await profileModel.findOneAndUpdate(
          {
            userId: id,
          },
          {
            $inc: {
              balance: amtChange,
            },
          }
        );

        if (label === double) {
          gambleEmbed
            .setTitle("DOUBLED! You just doubled your gamble!")
            .setFooter({ text: `${username} gained ${amtChange} coins!` });
        } else if (label === half) {
          gambleEmbed
            .setTitle("Well... you just lost half your gamble! 😅")
            .setFooter({ text: `${username} lost ${-amtChange} coins!` });
        } else if (label === lose) {
          gambleEmbed
            .setTitle("Oops! you just lost your entire gamble...")
            .setFooter({ text: `${username} lost ${-amtChange} coins!` });
        }

        await i.update({ embeds: [gambleEmbed], components: [row] });
        collector.stop();
      });
    } else if (gambleCommand === "blackjack") {
      const amount = interaction.options.getInteger("amount");

      if (balance < amount) {
        await interaction.deferReply({ ephemeral: true });
        return await interaction.editReply(
          `You don't have ${amount} coins to gamble with`
        );
      }

      await interaction.deferReply();

      // Deal two cards to player and dealer
      let playerCards = [getRandomCard(), getRandomCard()];
      let dealerCards = [getRandomCard(), getRandomCard()];

      let playerTotal = calculateHandValue(playerCards);
      let dealerTotal = calculateHandValue(dealerCards);

      // Helper to format cards for display
      const formatCards = (cards) => cards.map((c) => c.rank).join(", ");

      // Initial embed showing player's cards and the dealer's first card only
      gambleEmbed
        .setTitle(`Blackjack - Wager: ${amount}`)
        .setDescription(
          `Your hand: **${formatCards(
            playerCards
          )}** (Total: ${playerTotal})\n` +
            `Dealer shows: **${dealerCards[0].rank}**\n\n` +
            `Choose to Hit or Stand.`
        );

      // Hit and Stand buttons
      const hitButton = new ButtonBuilder()
        .setCustomId("hit")
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary);

      const standButton = new ButtonBuilder()
        .setCustomId("stand")
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(hitButton, standButton);

      // Send the initial message with embed and buttons
      const message = await interaction.editReply({
        embeds: [gambleEmbed],
        components: [row],
      });

      // Only allow the user who ran the command to interact
      const filter = (i) => i.user.id === interaction.user.id;

      // Set up a button collector for 180 seconds
      const collector = message.createMessageComponentCollector({
        filter,
        time: 180000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "hit") {
          // Add a card to the player's hand
          playerCards.push(getRandomCard());
          playerTotal = calculateHandValue(playerCards);

          if (playerTotal > 21) {
            // Player busts and loses
            gambleEmbed
              .setTitle("Bust! You exceeded 21 :(")
              .setDescription(
                `Your hand: **${formatCards(
                  playerCards
                )}** (Total: ${playerTotal})\n` +
                  `Dealer hand: **${formatCards(
                    dealerCards
                  )}** (Total: ${dealerTotal})\n\n` +
                  `You lost ${amount} coins. Better luck next time!`
              )
              .setColor(0xff0000);

            await profileModel.findOneAndUpdate(
              { userId: id },
              { $inc: { balance: -amount } }
            );

            await i.update({ embeds: [gambleEmbed], components: [] });
            collector.stop();
            return;
          } else {
            // Player can continue - update embed and buttons
            gambleEmbed.setDescription(
              `Your hand: **${formatCards(
                playerCards
              )}** (Total: ${playerTotal})\n` +
                `Dealer shows: **${dealerCards[0].rank}**\n\n` +
                `Choose to Hit or Stand.`
            );
            await i.update({ embeds: [gambleEmbed], components: [row] });
          }
        } else if (i.customId === "stand") {
          // Dealer plays: hits until 17 or more
          while (dealerTotal < 17) {
            dealerCards.push(getRandomCard());
            dealerTotal = calculateHandValue(dealerCards);
          }

          // Decide who won
          let resultText = "";
          let color = 0x00aa6d;
          let amountChange = 0;

          if (dealerTotal > 21 || playerTotal > dealerTotal) {
            resultText = `You win! You gained ${amount} coins!`;
            amountChange = amount;
            color = 0x00ff00;
          } else if (playerTotal === dealerTotal) {
            resultText = `It's a tie! You get your bet back.`;
            amountChange = 0;
            color = 0x00ff00;
          } else {
            resultText = `You lose! You lost ${amount} coins!`;
            amountChange = -amount;
            color = 0x00ff00;
          }

          gambleEmbed
            .setTitle("Blackjack Result")
            .setDescription(
              `Your hand: **${formatCards(
                playerCards
              )}** (Total: ${playerTotal})\n` +
                `Dealer hand: **${formatCards(
                  dealerCards
                )}** (Total: ${dealerTotal})\n\n` +
                resultText
            )
            .setColor(color);

          if (amountChange !== 0) {
            await profileModel.findOneAndUpdate(
              { userId: id },
              { $inc: { balance: amountChange } }
            );
          }

          await i.update({ embeds: [gambleEmbed], components: [] });
          collector.stop();
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          gambleEmbed
            .setTitle("Timed out!")
            .setDescription("You took too long to respond. Game cancelled.")
            .setColor(0xffa500);
          await interaction.editReply({
            embeds: [gambleEmbed],
            components: [],
          });
        }
      });
    }
  },
};
