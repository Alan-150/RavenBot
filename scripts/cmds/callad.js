const { getStreamsFromAttachment, log } = global.utils;
const mediaTypes = ["photo", 'png', "animated_image", "video", "audio"];

module.exports = {
	config: {
		name: "callad",
		version: "1.8",
		author: "Blẳȼk",
		countDown: 5,
		role: 0,
		description: {
			fr: "Envoyer un rapport, une suggestion ou signaler un bug à l'administrateur du bot"
		},
		category: "utilitaire",
		guide: {
			fr: "   {pn} <message>"
		}
	},

	langs: {
		fr: {
			missingMessage: "❌ | Veuillez entrer un message à envoyer à l'administrateur.",
			sendByGroup: "\n- Envoyé depuis le groupe: %1 (ID: %2)",
			sendByUser: "\n- Envoyé depuis une conversation privée.",
			content: "\n\n📨 Message:\n%1",
			success: "✅ | Message envoyé avec succès à %2.",
			failed: "❌ | Échec de l'envoi du message à %2.",
			reply: "💬 Réponse de %1:\n\n%2",
			replyUserSuccess: "✅ | Réponse envoyée à l'utilisateur.",
			feedback: "💬 Réponse de l'administrateur %1 (ID: %2)%3:\n\n%4",
			replySuccess: "✅ | Réponse envoyée avec succès."
		}
	},

	onStart: async function ({ args, message, event, usersData, threadsData, api, commandName, getLang }) {
		if (!args[0]) return message.reply(getLang("missingMessage"));

		const { senderID, threadID, isGroup, messageID } = event;
		const adminGroupID = "9156539577763638";
		const senderName = await usersData.getName(senderID);

		const msg = "==📨 APPEL À L'ADMIN 📨=="
			+ `\n- Nom d'utilisateur: ${senderName}`
			+ `\n- ID utilisateur: ${senderID}`
			+ (isGroup ? getLang("sendByGroup", (await threadsData.get(threadID)).threadName, threadID) : getLang("sendByUser"));

		const formMessage = {
			body: msg + getLang("content", args.join(" ")),
			mentions: [{ id: senderID, tag: senderName }],
			attachment: await getStreamsFromAttachment(
				[...event.attachments, ...(event.messageReply?.attachments || [])]
					.filter(item => mediaTypes.includes(item.type))
			)
		};

		try {
			const sent = await api.sendMessage(formMessage, adminGroupID);
			message.reply(getLang("success", "le groupe des admins"));
			global.GoatBot.onReply.set(sent.messageID, {
				commandName,
				messageID: sent.messageID,
				messageIDSender: messageID,
				threadID, // origine
				type: "userCallAdmin"
			});
		} catch (err) {
			log.err("APPEL ADMIN", err);
			return message.reply(getLang("failed", "le groupe des admins"));
		}
	},

	onReply: async ({ args, event, api, message, Reply, usersData, commandName, getLang }) => {
		const { type, threadID, messageIDSender } = Reply;
		const senderID = event.senderID;
		const senderName = await usersData.getName(senderID);
		const { isGroup } = event;

		// ✅ Ignore si ce n'est pas un admin du bot
		const adminList = global.GoatBot.config.adminBot || [];
		if (!adminList.includes(senderID)) return;

		switch (type) {
			case "userCallAdmin": {
				const formMessage = {
					body: getLang("reply", senderName, args.join(" ")),
					mentions: [{ id: senderID, tag: senderName }],
					attachment: await getStreamsFromAttachment(
						event.attachments.filter(item => mediaTypes.includes(item.type))
					)
				};
				api.sendMessage(formMessage, Reply.threadID, (err, info) => {
					if (err) return message.err(err);
					message.reply(getLang("replyUserSuccess"));
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "adminReply"
					});
				}, messageIDSender);
				break;
			}
			case "adminReply": {
				let sendByGroup = "";
				if (isGroup) {
					const { threadName } = await api.getThreadInfo(event.threadID);
					sendByGroup = getLang("sendByGroup", threadName, event.threadID);
				}
				const formMessage = {
					body: getLang("feedback", senderName, senderID, sendByGroup, args.join(" ")),
					mentions: [{ id: senderID, tag: senderName }],
					attachment: await getStreamsFromAttachment(
						event.attachments.filter(item => mediaTypes.includes(item.type))
					)
				};
				api.sendMessage(formMessage, Reply.threadID, (err, info) => {
					if (err) return message.err(err);
					message.reply(getLang("replySuccess"));
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "userCallAdmin"
					});
				}, messageIDSender);
				break;
			}
		}
	}
};
