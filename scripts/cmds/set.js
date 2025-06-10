module.exports = {
  config: {
    name: "set",
    version: "1.1",
    author: "TawsiN", 
    countDown: 5,
    role: 2, 
    shortDescription: {
      vi: "Đặt số tiền cho người dùng (có thể tag hoặc dùng ID)",
      en: "Set money for user (can mention or use ID)"
    },
    description: {
      vi: "Lệnh dùng để đặt số tiền cho người dùng, hỗ trợ tag người dùng hoặc dùng ID",
      en: "Command to set a user's money, supports mention or user ID"
    },
    category: "admin",
    guide: {
      vi: "Sử dụng: setmoney <số tiền> [tag hoặc ID người dùng]",
      en: "Usage: setmoney <amount> [mention or userID]"
    }
  },

  langs: {
    vi: {
      noAmount: "Vui lòng nhập số tiền hợp lệ!",
      setSuccess: "Đã đặt %1 tiền cho người dùng %2.",
      invalidUser: "ID hoặc người dùng không hợp lệ!"
    },
    en: {
      noAmount: "Please provide a valid amount!",
      setSuccess: "Set %1 money for user %2 successfully.",
      invalidUser: "Invalid user ID or user!"
    }
  },

  onStart: async function ({ api, args, message, event, usersData, getLang }) {
    // Check amount argument
    if (!args[0] || isNaN(args[0])) {
      return message.reply(getLang("noAmount"));
    }

    const amount = parseInt(args[0], 10);

    // Default target userID is sender
    let userID = event.senderID;

    // If message has mentions, pick the first mentioned user
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      userID = Object.keys(event.mentions)[0];
    }
    // Else if 2nd arg exists and is a number, use it as userID
    else if (args[1] && /^\d+$/.test(args[1])) {
      userID = args[1];
    }

    // Just in case check userID format again
    if (!userID || !/^\d+$/.test(userID)) {
      return message.reply(getLang("invalidUser"));
    }

    // Set money for userID
    usersData.set(userID, { money: amount });

    // Prepare user mention or ID for reply
    let userTag = userID === event.senderID ? "bạn" : `người dùng có ID ${userID}`;

    // Reply confirming success
    return message.reply(getLang("setSuccess", amount, userTag));
  }
};
