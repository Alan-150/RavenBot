const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "accept",
    aliases: ['acp'],
    version: "1.3",
    author: "Blẳȼk",
    countDown: 8,
    role: 2,
    shortDescription: "accept users",
    longDescription: "accept users",
    category: "owner",
  },

  onReply: async function ({ message, Reply, event, api, commandName }) {
    const { author, listRequest, messageID } = Reply;
    if (author !== event.senderID) return;
    const args = event.body.replace(/ +/g, " ").toLowerCase().split(" ");

    clearTimeout(Reply.unsendTimeout);

    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      variables: {
        input: {
          source: "friends_tab",
          actor_id: api.getCurrentUserID(),
          client_mutation_id: Math.round(Math.random() * 19).toString()
        },
        scale: 3,
        refresh_num: 0
      }
    };

    const success = [];
    const failed = [];

    if (args[0] === "add") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
      form.doc_id = "3147613905362928";
    } else if (args[0] === "del") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
      form.doc_id = "4108254489275063";
    } else {
      return api.sendMessage("Please select <add | del > <target number | or \"all\">", event.threadID, event.messageID);
    }

    let targetIDs = args.slice(1);
    if (args[1] === "all") {
      targetIDs = [];
      for (let i = 1; i <= listRequest.length; i++) targetIDs.push(i);
    }

    const newTargetIDs = [];
    const promiseFriends = [];

    for (const stt of targetIDs) {
      const u = listRequest[parseInt(stt) - 1];
      if (!u) {
        failed.push(`Can't find stt ${stt} in the list`);
        continue;
      }
      form.variables.input.friend_requester_id = u.node.id;
      form.variables = JSON.stringify(form.variables);
      newTargetIDs.push(u);
      promiseFriends.push(api.httpPost("https://www.facebook.com/api/graphql/", form));
      form.variables = JSON.parse(form.variables);
    }

    for (let i = 0; i < newTargetIDs.length; i++) {
      try {
        const friendRequest = await promiseFriends[i];
        if (JSON.parse(friendRequest).errors) {
          failed.push(newTargetIDs[i].node.name);
        } else {
          success.push(newTargetIDs[i].node.name);
        }
      } catch (e) {
        failed.push(newTargetIDs[i].node.name);
      }
    }

    if (success.length > 0) {
      api.sendMessage(`» The ${args[0] === 'add' ? 'friend request' : 'friend request deletion'} has been processed for ${success.length} people:\n\n${success.join("\n")}${failed.length > 0 ? `\n» The following ${failed.length} people encountered errors: ${failed.join("\n")}` : ""}`, event.threadID, event.messageID);
    } else {
      api.unsendMessage(messageID);
      return api.sendMessage("Invalid response. Please provide a valid response.", event.threadID);
    }

    api.unsendMessage(messageID);
  },

  onStart: async function ({ event, api, args, commandName }) {
    if (args[0] === "-add" && args[1]) {
      const targetUID = args[1].trim();

      const form = {
        av: api.getCurrentUserID(),
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
        doc_id: "3147613905362928",
        variables: JSON.stringify({
          input: {
            source: "friends_tab",
            actor_id: api.getCurrentUserID(),
            friend_requester_id: targetUID,
            client_mutation_id: Math.round(Math.random() * 19).toString()
          },
          scale: 3,
          refresh_num: 0
        })
      };

      try {
        const res = await api.httpPost("https://www.facebook.com/api/graphql/", form);
        const json = JSON.parse(res);
        if (json.errors) throw new Error("Facebook error");

        const info = await api.getUserInfo(targetUID);
        const name = info?.[targetUID]?.name || "Unknown";

        return api.sendMessage(`✅ Successfully accepted friend request from ${name} (UID: ${targetUID})`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`❌ Failed to accept friend request from UID: ${targetUID}`, event.threadID, event.messageID);
      }
    }

    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
      fb_api_caller_class: "RelayModern",
      doc_id: "4499164963466303",
      variables: JSON.stringify({ input: { scale: 3 } })
    };

    const raw = await api.httpPost("https://www.facebook.com/api/graphql/", form);
    const listRequest = JSON.parse(raw).data.viewer.friending_possibilities.edges;

    let msg = `📥 Invitations - Page 1/1\n〓〓〓〓〓〓〓〓〓〓〓〓〓`;
    let i = 0;
    for (const user of listRequest) {
      i++;
      const nom = user.node.name;
      const uid = user.node.id;
      const url = user.node.url.replace("www.facebook", "fb");
      const time = moment(user.time * 1009).tz("Asia/Manila").format("DD/MM/YYYY HH:mm:ss");

      msg += `\n${i}. 👤 ${nom}`
        + `\n🆔 ID: ${uid}`
        + `\n🔗 URL: ${url}`
        + `\n🕒 Temps: ${time}`
        + `\n༺═────────────═༻`;
    }

    msg += `\n📌 Réponds : \`add <numéro|all>\` ou \`del <numéro|all>\``;

    api.sendMessage(msg, event.threadID, (e, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName,
        messageID: info.messageID,
        listRequest,
        author: event.senderID,
        unsendTimeout: setTimeout(() => {
          api.unsendMessage(info.messageID);
        }, this.config.countDown * 1000)
      });
    });
  }
};
