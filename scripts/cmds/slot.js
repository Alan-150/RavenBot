// Updated Slot Command for GoatBotV2
const fruitEmojis = ["🍒", "🍇", "🍊", "🍉", "🍎", "🍓", "🍏", "🍌"];

function formatMoney(number) {
  if (number >= 1e9) return (number / 1e9).toFixed(2) + 'B';
  if (number >= 1e6) return (number / 1e6).toFixed(2) + 'M';
  if (number >= 1e3) return (number / 1e3).toFixed(1) + 'K';
  return number.toString();
}

module.exports = {
  config: {
    name: "slot",
    version: "5.0",
    author: "Madara",
    countDown: 2,
    role: 0,
    shortDescription: "🔥 Extreme slot machine challenge",
    longDescription: "Harder slot machine with savage wins/losses. Use '/slot stats' to view your stats or '/slot top' to view the leaderboard.",
    category: "game",
    guide: "{pn} [amount] | stats | top | reset"
  },

  onStart: async function ({ api, args, event, usersData, message }) {
    const { senderID, threadID } = event;
    const userData = await usersData.get(senderID);
    const arg = args[0]?.toLowerCase();

    // Hidden reset function only accessible to TawsiN
    if (arg === "reset") {
      if (senderID !== "61575839792460") return message.reply("🚫 You don't have permission to reset stats.");
      const allUsers = await usersData.getAll();
      for (const user of allUsers) {
        if (user.data?.slotStats) {
          user.data.slotStats = undefined;
          await usersData.set(user.userID, { data: user.data });
        }
      }
      return message.reply("✅ All slot stats and leaderboard data reset successfully.");
    }

    // Show stats
    if (arg === "stats") {
      const stats = userData.data.slotStats;
      if (!stats) return message.reply("📊 No slot stats available yet. Spin to start tracking!");
      return message.reply(`📊 Your Slot Stats:\n▫ Games Won: ${stats.won}\n▫ Games Lost: ${stats.lost}\n▫ Total Earned: ${formatMoney(stats.earned)}\n▫ Total Lost: ${formatMoney(stats.lostMoney)}`);
    }

    // Show top
    if (arg === "top") {
      const allUsers = await usersData.getAll();
      const filtered = allUsers.filter(u => u.data?.slotStats);
      filtered.sort((a, b) => {
        const aNet = a.data.slotStats.earned - a.data.slotStats.lostMoney;
        const bNet = b.data.slotStats.earned - b.data.slotStats.lostMoney;
        return bNet - aNet;
      });
      const top10 = filtered.slice(0, 10);
      let rankMsg = "🏆 Top Slot Legends:\n";
      top10.forEach((u, i) => {
        const net = u.data.slotStats.earned - u.data.slotStats.lostMoney;
        rankMsg += `${i + 1}. ${u.name || u.userID}: Net ${formatMoney(net)}\n`;
      });
      return message.reply(rankMsg);
    }

    // Initialize stats if not present
    if (!userData.data.slotStats) {
      userData.data.slotStats = { won: 0, lost: 0, earned: 0, lostMoney: 0 };
    }

    const bet = parseInt(arg);
    if (isNaN(bet)) return message.reply("🔢 Please enter a valid number to bet.\nExample: /slot 300");
    if (bet < 100) return message.reply("🚫 Minimum bet is 100 coins.");
    if (bet > userData.money) return message.reply(`😢 You don't have enough coins.\n💰 Your balance: ${formatMoney(userData.money)}`);

    const slots = [getRandomFruit(), getRandomFruit(), getRandomFruit()];
    const winnings = calculateWinnings(slots, bet);
    const newBalance = userData.money + winnings;

    const stats = userData.data.slotStats;
    if (winnings > 0) {
      stats.won++;
      stats.earned += winnings;
    } else {
      stats.lost++;
      stats.lostMoney += bet;
    }

    await usersData.set(senderID, { money: newBalance, data: userData.data });

    let resultMsg = `🎰 | ${slots.join(" | ")}`;
    let statusMsg;

    const winMsgs = [
      `💸 JACKPOT! You just made ${formatMoney(winnings)} coins!`,
      `🎉 Big Win! ${formatMoney(winnings)} coins secured!`,
      `🤑 That’s a fortune! +${formatMoney(winnings)} coins!`,
      `🔥 WINNING STREAK! +${formatMoney(winnings)}!!`
    ];
    const loseMsgs = [
      `📉 You flushed ${formatMoney(-winnings)} down the toilet. Epic fail.`,
      `💀 Oof! ${formatMoney(-winnings)} coins gone. R.I.P.`,
      `🫠 Crushed dreams... -${formatMoney(-winnings)} coins.`,
      `👎 You played yourself and lost ${formatMoney(-winnings)}.`
    ];
    const drawMsgs = [
      `😐 Neutral spin. No gain, no loss. Try harder.`,
      `🟡 Draw! Walk away like a champ... or not.`,
      `🪙 Nothing happened... boring.`
    ];

    if (winnings > 0) {
      statusMsg = winMsgs[Math.floor(Math.random() * winMsgs.length)];
    } else if (winnings === 0) {
      statusMsg = drawMsgs[Math.floor(Math.random() * drawMsgs.length)];
    } else {
      statusMsg = loseMsgs[Math.floor(Math.random() * loseMsgs.length)];
    }

    return message.reply(`${resultMsg}\n${statusMsg}`);
  }
};

function getRandomFruit() {
  const cherryBias = 0.05; // harder to win
  if (Math.random() < cherryBias) return "🍒";
  const others = fruitEmojis.filter(f => f !== "🍒");
  return others[Math.floor(Math.random() * others.length)];
}

function calculateWinnings([a, b, c], bet) {
  const jackpotRoll = Math.random();
  if (jackpotRoll < 0.0003) return bet * 10; // super rare jackpot
  if (a === b && b === c) return a === "🍒" ? Math.floor(bet * 1.5) : Math.floor(bet * 1.2);
  if (a === b || a === c || b === c) return Math.floor(bet * 0.1);
  return -bet;
    }
