"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _lib = require('../../.lib-dist');





var _helptickets = require('./helptickets');
var _artemis = require('../artemis'); var Artemis = _artemis;

const ORDERED_PUNISHMENTS = ['WARN', 'FORCERENAME', 'LOCK', 'NAMELOCK', 'WEEKLOCK', 'WEEKNAMELOCK'];
const PMLOG_IGNORE_TIME = 24 * 60 * 60 * 1000;
const WHITELIST = ['mia'];


















const defaults = {
	punishments: [{
		ticketType: 'inapname',
		punishment: 'forcerename',
		severity: {type: ['sexual_explicit', 'severe_toxicity', 'identity_attack'], certainty: 0.4},
	}, {
		ticketType: 'pmharassment',
		punishment: 'warn',
		severity: {type: ['sexual_explicit', 'severe_toxicity', 'identity_attack'], certainty: 0.15},
	}],
	applyPunishments: false,
};

 const settings = (() => {
	try {
		// spreading w/ default means that
		// adding new things won't crash by not existing
		return {...defaults, ...JSON.parse(_lib.FS.call(void 0, 'config/chat-plugins/ht-auto.json').readSync())};
	} catch (e) {
		return defaults;
	}
})(); exports.settings = settings;

function saveSettings() {
	return _lib.FS.call(void 0, 'config/chat-plugins/ht-auto.json').writeUpdate(() => JSON.stringify(exports.settings));
}

function visualizePunishment(punishment) {
	const buf = [`punishment: ${_optionalChain([punishment, 'access', _ => _.punishment, 'optionalAccess', _2 => _2.toUpperCase, 'call', _3 => _3()])}`];
	buf.push(`ticket type: ${punishment.ticketType}`);
	if (punishment.severity) {
		buf.push(`severity: ${punishment.severity.certainty} (for ${punishment.severity.type.join(', ')})`);
	}
	if (punishment.modlogCount) {
		buf.push(`required modlog: ${punishment.modlogCount}`);
	}
	if (punishment.isSingleMessage) {
		buf.push(`for single messages only`);
	}
	return buf.join(', ');
}

function checkAccess(context) {
	if (!WHITELIST.includes(context.user.id)) context.checkCan('bypassall');
}

 function punishmentsFor(type) {
	return exports.settings.punishments.filter(t => t.ticketType === type);
} exports.punishmentsFor = punishmentsFor;

/** Is punishment1 higher than punishment2 on the list? */
function supersedes(p1, p2) {
	return ORDERED_PUNISHMENTS.indexOf(p1) > ORDERED_PUNISHMENTS.indexOf(p2);
}

 function determinePunishment(
	ticketType, results, modlog, isSingleMessage = false
) {
	const punishments = punishmentsFor(ticketType);
	let action = null;
	const types = [];
	_lib.Utils.sortBy(punishments, p => -ORDERED_PUNISHMENTS.indexOf(p.punishment));
	for (const punishment of punishments) {
		if (isSingleMessage && !punishment.isSingleMessage) continue;
		if (punishment.modlogCount && modlog.length < punishment.modlogCount) continue;
		if (punishment.severity) {
			let hit = false;
			for (const type of punishment.severity.type) {
				if (results[type] < punishment.severity.certainty) continue;
				hit = true;
				types.push(type);
				break;
			}
			if (!hit) continue;
		}
		if (!action || supersedes(punishment.punishment, action)) {
			action = punishment.punishment;
		}
	}
	return {action, types};
} exports.determinePunishment = determinePunishment;

 function globalModlog(action, user, note, roomid) {
	user = Users.get(user) || user;
	void Rooms.Modlog.write(roomid || 'global', {
		action,
		ip: user && typeof user === 'object' ? user.latestIp : undefined,
		userid: toID(user) || undefined,
		loggedBy: 'artemis' ,
		note,
	});
} exports.globalModlog = globalModlog;

 function addModAction(message) {
	_optionalChain([Rooms, 'access', _4 => _4.get, 'call', _5 => _5('staff'), 'optionalAccess', _6 => _6.add, 'call', _7 => _7(`|c|&|/log ${message}`), 'access', _8 => _8.update, 'call', _9 => _9()]);
} exports.addModAction = addModAction;

 async function getModlog(params) {
	const search = {
		note: [],
		user: [],
		ip: [],
		action: [],
		actionTaker: [],
	};
	if (params.user) search.user = [{search: params.user, isExact: true}];
	if (params.ip) search.ip = [{search: params.ip}];
	if (params.actions) search.action = params.actions.map(s => ({search: s}));
	const res = await Rooms.Modlog.search('global', search);
	return _optionalChain([res, 'optionalAccess', _10 => _10.results]) || [];
} exports.getModlog = getModlog;

function closeTicket(ticket, msg) {
	if (!ticket.open) return;
	ticket.open = false;
	ticket.active = false;
	ticket.resolved = {
		time: Date.now(),
		by: 'the Artemis AI', // we want it to be clear to end users that it was not a human
		seen: false,
		staffReason: '',
		result: msg || '',
		note: (
			`Want to learn more about the AI? ` +
			`<a href="https://www.smogon.com/forums/threads/3570628/#post-9056769">Visit the information thread</a>.`
		),
	};
	_helptickets.writeTickets.call(void 0, );
	_helptickets.notifyStaff.call(void 0, );
	const tarUser = Users.get(ticket.userid);
	if (tarUser) {
		_helptickets.HelpTicket.notifyResolved(tarUser, ticket, ticket.userid);
	}
	// TODO: Support closing as invalid
	_helptickets.writeStats.call(void 0, `${ticket.type}\t${Date.now() - ticket.created}\t0\t0\tresolved\tvalid\tartemis`);
}

async function lock(
	user,
	result,
	ticket,
	isWeek,
	isName
) {
	const id = toID(user);
	let desc, type;
	const expireTime = isWeek ? Date.now() + 7 * 24 * 60 * 60 * 1000 : null;
	if (isName) {
		if (typeof user === 'object') user.resetName();
		desc = 'locked your username and prevented you from changing names';
		type = `locked from talking${isWeek ? ` for a week` : ""}`;
		await Punishments.namelock(id, expireTime, null, false, result.reason || "Automatically locked due to a user report");
	} else {
		type = isWeek ? 'weeknamelocked' : 'namelocked';
		desc = 'locked you from talking in chats, battles, and PMing regular users';
		await Punishments.lock(id, expireTime, null, false, result.reason || "Automatically locked due to a user report");
	}
	if (typeof user !== 'string') {
		let message = `|popup||html|${user.name} has ${desc} for ${isWeek ? '7' : '2'} days.`;
		if (result.reason) message += `\n\nReason: ${result.reason}`;
		let appeal = '';
		if (Chat.pages.help) {
			appeal += `<a href="view-help-request--appeal"><button class="button"><strong>Appeal your punishment</strong></button></a>`;
		} else if (Config.appealurl) {
			appeal += `appeal: <a href="${Config.appealurl}">${Config.appealurl}</a>`;
		}
		if (appeal) message += `\n\nIf you feel that your lock was unjustified, you can ${appeal}.`;
		message += `\n\nYour lock will expire in a few days.`;
		user.send(message);
	}
	addModAction(`${id} was ${type} by Artemis. (${result.reason || `report from ${ticket.creator}`})`);
	globalModlog(
		`${isWeek ? 'WEEK' : ""}${isName ? "NAME" : ""}LOCK`, id,
		(result.reason || `report from ${ticket.creator}`) + (result.proof ? ` PROOF: ${result.proof}` : "")
	);
}

 const actionHandlers

 = {
	forcerename(user, result, ticket) {
		if (typeof user === 'string') return; // they can only submit users with existing userobjects anyway
		const id = toID(user);
		user.resetName();
		user.trackRename = id;
		Monitor.forceRenames.set(id, true);
		user.send(
			'|nametaken|Your name was detected to be breaking our name rules. ' +
			`${result.reason ? `Reason: ${result.reason}. ` : ""}` +
			'Please change it, or submit a help ticket by typing /ht in chat to appeal this action.'
		);
		_optionalChain([Rooms, 'access', _11 => _11.get, 'call', _12 => _12('staff'), 'optionalAccess', _13 => _13.add, 'call', _14 => _14(
			`|html|<span class="username">${id}</span> ` +
			`was automatically forced to choose a new name by Artemis (report from ${ticket.userid}).`
		), 'access', _15 => _15.update, 'call', _16 => _16()]);
		globalModlog(
			'FORCERENAME', id, `username determined to be inappropriate due to a report by ${ticket.creator}`, result.roomid
		);
		return `${id} was automatically forcerenamed. Thank you for reporting.`;
	},
	async namelock(user, result, ticket) {
		await lock(user, result, ticket, false, true);
		return `${toID(user)} was automatically namelocked. Thank you for reporting.`;
	},
	async weeknamelock(user, result, ticket) {
		await lock(user, result, ticket, true, true);
		return `${toID(user)} was automatically weeknamelocked. Thank you for reporting.`;
	},
	async lock(user, result, ticket) {
		await lock(user, result, ticket);
		return `${toID(user)} was automatically locked. Thank you for reporting.`;
	},
	async weeklock(user, result, ticket) {
		await lock(user, result, ticket, true);
		return `${toID(user)} was automatically weeklocked. Thank you for reporting.`;
	},
	warn(user, result, ticket) {
		user = toID(user);
		user = Users.get(user) || user;
		if (typeof user === 'object') {
			user.send(`|c|~|/warn ${result.reason || ""}`);
		} else {
			Punishments.offlineWarns.set(user, result.reason);
		}
		addModAction(
			`${user} was warned by Artemis. ${typeof user === 'string' ? 'while offline ' : ""}` +
			`(${result.reason || `report from ${ticket.creator}`})`
		);
		globalModlog(
			'WARN', user, result.reason || `report from ${ticket.creator}`
		);
		return `${user} was automatically warned. Thank you for reporting.`;
	},
}; exports.actionHandlers = actionHandlers;

function shouldNotProcess(message) {
	return (
		// special 'command', blocks things like /log, /raw, /html
		// (but not a // message)
		(message.startsWith('/') && !message.startsWith('//')) ||
		// broadcasted chat command
		message.startsWith('!')
	);
}

 async function getMessageAverages(messages) {
	const counts = {};
	const classified = [];
	for (const message of messages) {
		if (shouldNotProcess(message)) continue;
		const res = await exports.classifier.classify(message);
		if (!res) continue;
		classified.push(res);
		for (const k in res) {
			if (!counts[k]) counts[k] = {count: 0, raw: 0};
			counts[k].count++;
			counts[k].raw += res[k];
		}
	}
	const averages = {};
	for (const k in counts) {
		averages[k] = counts[k].raw / counts[k].count;
	}
	return {averages, classified};
} exports.getMessageAverages = getMessageAverages;













 const checkers

 = {
	async inapname(ticket) {
		const id = toID(ticket.text[0]);
		const user = Users.getExact(id);
		if (user && !user.trusted) {
			const result = await exports.classifier.classify(user.name);
			if (!result) return;
			const keys = ['identity_attack', 'sexual_explicit', 'severe_toxicity'];
			const matched = keys.some(k => result[k] >= 0.4);
			if (matched) {
				const modlog = await getModlog({
					ip: user.latestIp,
					actions: ['FORCERENAME', 'NAMELOCK', 'WEEKNAMELOCK'],
				});
				let {action} = determinePunishment('inapname', result, modlog);
				if (!action) action = 'forcerename';
				return new Map([[user.id, {
					action,
					user,
					result,
					reason: "Username detected to be breaking username rules",
				}]]);
			}
		}
	},
	async inappokemon(ticket) {
		const actions = new Map();
		const links = [..._helptickets.getBattleLinks.call(void 0, ticket.text[0]), ..._helptickets.getBattleLinks.call(void 0, ticket.text[1])];
		for (const link of links) {
			const log = await _helptickets.getBattleLog.call(void 0, link);
			if (!log) continue;
			for (const [user, pokemon] of Object.entries(log.pokemon)) {
				const userid = toID(user);
				let result

 = null;
				for (const set of pokemon) {
					if (!set.name) continue;
					const results = await exports.classifier.classify(set.name);
					if (!results) continue;
					// atm don't factor in modlog
					const curAction = determinePunishment('inappokemon', results, []).action;
					if (curAction && (!result || supersedes(curAction, result.action))) {
						result = {action: curAction, name: set.name, result: results, replay: link};
					}
				}
				if (result) {
					actions.set(user, {
						action: result.action,
						user: userid,
						result: result.result,
						reason: `Pokemon name detected to be breaking rules - '${result.name}'`,
						roomid: link,
					});
				}
			}
		}
		if (actions.size) return actions;
	},
	async battleharassment(ticket) {
		const urls = _helptickets.getBattleLinks.call(void 0, ticket.text[0]);
		const actions = new Map();
		for (const url of urls) {
			const log = await _helptickets.getBattleLog.call(void 0, url);
			if (!log) continue;
			const messages = {};
			for (const message of log.log) {
				const [username, text] = _lib.Utils.splitFirst(message.slice(3), '|').map(f => f.trim());
				const id = toID(username);
				if (!id) continue;
				if (!messages[id]) messages[id] = [];
				messages[id].push(text);
			}
			for (const [id, messageList] of Object.entries(messages)) {
				const {averages, classified} = await getMessageAverages(messageList);
				const {action} = determinePunishment('battleharassment', averages, []);
				if (action) {
					const existingPunishment = actions.get(id);
					if (!existingPunishment || supersedes(action, existingPunishment.action)) {
						actions.set(id, {
							action,
							user: toID(id),
							result: averages,
							reason: `Not following rules in battles (https://${Config.routes.client}/${url})`,
							proof: urls.join(', '),
						});
					}
				}

				for (const result of classified) {
					const curPunishment = determinePunishment('battleharassment', result, [], true).action;
					if (!curPunishment) continue;
					const exists = actions.get(id);
					if (!exists || supersedes(curPunishment, exists.action)) {
						actions.set(id, {
							action: curPunishment,
							user: toID(id),
							result: averages,
							reason: `Not following rules in battles (https://${Config.routes.client}/${url})`,
							proof: urls.join(', '),
						});
					}
				}
			}
		}
		// ensure reasons are clear
		const creatorWasPunished = actions.get(ticket.userid);
		if (creatorWasPunished) {
			let displayReason = 'You were punished for your behavior.';
			if (actions.size !== 1) { // more than 1 was punished
				displayReason += ` ${actions.size - 1} other(s) were also punished.`;
			}
			creatorWasPunished.displayReason = displayReason;
		}

		if (actions.size) return actions;
	},
	async pmharassment(ticket) {
		const actions = new Map();
		const targetId = toID(ticket.text[0]);
		const creator = ticket.userid;
		if (!Config.getpmlog) return;
		const pmLog = await Config.getpmlog(targetId, creator) 

;
		const messages = {};
		const ids = new Set();
		// sort messages by user who sent them, also filter out old ones
		for (const {from, message, timestamp} of pmLog) {
			// ignore pmlogs more than 24h old
			if ((Date.now() - new Date(timestamp).getTime()) > PMLOG_IGNORE_TIME) continue;
			const id = toID(from);
			ids.add(id);
			if (!messages[id]) messages[id] = [];
			messages[id].push(message);
		}
		for (const id of ids) {
			let punishment;
			const {averages, classified} = await getMessageAverages(messages[id]);
			const curPunishment = determinePunishment('pmharassment', averages, []).action;
			if (curPunishment) {
				if (!punishment || supersedes(curPunishment, punishment)) {
					punishment = curPunishment;
				}
				if (punishment) {
					actions.set(id, {
						action: punishment,
						user: id,
						result: {},
						reason: `PM harassment (against ${ticket.userid === id ? targetId : ticket.userid})`,
					});
				}
			}
			for (const result of classified) {
				const {action} = determinePunishment('pmharassment', result, [], true);
				if (!action) continue;
				const exists = actions.get(id);
				if (!exists || supersedes(action, exists.action)) {
					actions.set(id, {
						action,
						user: id,
						result: {},
						reason: `PM harassment (against ${ticket.userid === id ? targetId : ticket.userid})`,
					});
				}
			}
		}

		const creatorWasPunished = actions.get(ticket.userid);
		if (creatorWasPunished) {
			let displayReason = `You were punished for your behavior. `;
			if (actions.has(targetId) && targetId !== ticket.userid) {
				displayReason += ` The person you reported was also punished.`;
			}
			creatorWasPunished.displayReason = displayReason;
		}

		if (actions.size) return actions;
	},
}; exports.checkers = checkers;

 const classifier = new Artemis.LocalClassifier(); exports.classifier = classifier;

 async function runPunishments(ticket, typeId) {
	let result = null;
	if (exports.checkers[typeId]) {
		result = await exports.checkers[typeId](ticket) || null;
	}
	if (result) {
		if (exports.settings.applyPunishments) {
			const responses = [];
			for (const res of result.values()) {
				const curResult = await exports.actionHandlers[res.action.toLowerCase()](res.user, res, ticket);
				if (curResult) responses.push([res.action, res.displayReason || curResult]);
				if (toID(res.user) === ticket.creator) {
					// just close the ticket here.
					closeTicket(ticket, res.displayReason);
				}
			}
			if (responses.length) {
				// if we don't have one for the user, find one.
				_lib.Utils.sortBy(responses, r => -ORDERED_PUNISHMENTS.indexOf(r[0]));
				closeTicket(ticket, responses[0][1]);
			} else {
				closeTicket(ticket); // no good response. just close it, because we __have__ dispatched an action.
			}
		} else {
			ticket.recommended = [];
			for (const res of result.values()) {
				_optionalChain([Rooms, 'access', _17 => _17.get, 'call', _18 => _18('abuselog'), 'optionalAccess', _19 => _19.add, 'call', _20 => _20(
					`|c|&|/log [${ticket.type} Monitor] Recommended: ${res.action}: for ${res.user} (${res.reason})`
				), 'access', _21 => _21.update, 'call', _22 => _22()]);
				ticket.recommended.push(`${res.action}: for ${res.user} (${res.reason})`);
			}
		}
	}
} exports.runPunishments = runPunishments;

 const commands = {
	aht: 'autohelpticket',
	autohelpticket: {
		''() {
			return this.parse(`/help autohelpticket`);
		},
		async test(target) {
			checkAccess(this);
			target = target.trim();
			const response = await exports.classifier.classify(target) || {};
			let buf = _lib.Utils.html`<strong>Results for "${target}":</strong><br />`;
			buf += `<strong>Score breakdown:</strong><br />`;
			for (const k in response) {
				buf += `&bull; ${k}: ${response[k]}<br />`;
			}
			this.runBroadcast();
			this.sendReplyBox(buf);
		},
		ap: 'addpunishment',
		add: 'addpunishment',
		addpunishment(target, room, user) {
			checkAccess(this);
			if (!toID(target)) return this.parse(`/help autohelpticket`);
			const args = Chat.parseArguments(target);
			const punishment = {};
			for (const [k, list] of Object.entries(args)) {
				if (k !== 'type' && list.length > 1) throw new Chat.ErrorMessage(`More than one ${k} param provided.`);
				const val = list[0]; // if key exists, val must exist too
				switch (k) {
				case 'type': case 't':
					const types = list.map(f => f.toLowerCase().replace(/\s/g, '_'));
					for (const type of types) {
						if (!Artemis.LocalClassifier.ATTRIBUTES[type]) {
							return this.errorReply(
								`Invalid classifier type '${type}'. Valid types are ` +
								Object.keys(Artemis.LocalClassifier.ATTRIBUTES).join(', ')
							);
						}
					}
					if (!punishment.severity) {
						punishment.severity = {certainty: 0, type: []};
					}
					punishment.severity.type.push(...types);
					break;
				case 'certainty': case 'c':
					const num = parseFloat(val);
					if (isNaN(num) || num < 0 || num > 1) {
						return this.errorReply(`Certainty must be a number below 1 and above 0.`);
					}
					if (!punishment.severity) {
						punishment.severity = {certainty: 0, type: []};
					}
					punishment.severity.certainty = num;
					break;
				case 'modlog': case 'm':
					const count = parseInt(val);
					if (isNaN(count) || count < 0) {
						return this.errorReply(`Modlog count must be a number above 0.`);
					}
					punishment.modlogCount = count;
					break;
				case 'ticket': case 'tt': case 'tickettype':
					const type = toID(val);
					if (!(type in exports.checkers)) {
						return this.errorReply(
							`The ticket type '${type}' does not exist or is not supported. ` +
							`Supported types are ${Object.keys(exports.checkers).join(', ')}.`
						);
					}
					punishment.ticketType = type;
					break;
				case 'p': case 'punishment':
					const name = toID(val).toUpperCase();
					if (!ORDERED_PUNISHMENTS.includes(name)) {
						return this.errorReply(
							`Punishment '${name}' not supported. ` +
							`Supported punishments: ${ORDERED_PUNISHMENTS.join(', ')}`
						);
					}
					punishment.punishment = name;
					break;
				case 'single': case 's':
					if (!this.meansYes(toID(val))) {
						return this.errorReply(
							`The 'single' value must always be 'on'. ` +
							`If you don't want it enabled, just do not use this argument type.`
						);
					}
					punishment.isSingleMessage = true;
					break;
				}
			}
			if (!punishment.ticketType) {
				return this.errorReply(`Must specify a ticket type to handle.`);
			}
			if (!punishment.punishment) {
				return this.errorReply(`Must specify a punishment to apply.`);
			}
			if (!(_optionalChain([punishment, 'access', _23 => _23.severity, 'optionalAccess', _24 => _24.certainty]) && _optionalChain([punishment, 'access', _25 => _25.severity, 'optionalAccess', _26 => _26.type, 'access', _27 => _27.length]))) {
				return this.errorReply(`A severity to monitor for must be specified (certainty).`);
			}
			for (const curP of exports.settings.punishments) {
				let matches = 0;
				for (const k in curP) {
					if (punishment[k ] === curP[k ]) {
						matches++;
					}
				}
				if (matches === Object.keys(punishment).length) {
					return this.errorReply(`That punishment is already added.`);
				}
			}
			exports.settings.punishments.push(punishment );
			saveSettings();
			this.privateGlobalModAction(
				`${user.name} added a ${punishment.punishment} punishment to the Artemis helpticket handler.`
			);
			this.globalModlog(`AUTOHELPTICKET ADDPUNISHMENT`, null, visualizePunishment(punishment ));
		},
		dp: 'deletepunishment',
		delete: 'deletepunishment',
		deletepunishment(target, room, user) {
			checkAccess(this);
			const num = parseInt(target) - 1;
			if (isNaN(num)) return this.parse(`/h autohelpticket`);
			const punishment = exports.settings.punishments[num];
			if (!punishment) return this.errorReply(`There is no punishment at index ${num + 1}.`);
			exports.settings.punishments.splice(num, 1);
			this.privateGlobalModAction(
				`${user.name} removed the Artemis helpticket ${punishment.punishment} punishment indexed at ${num + 1}`
			);
			this.globalModlog(`AUTOHELPTICKET REMOVE`, null, visualizePunishment(punishment));
		},
		vp: 'viewpunishments',
		view: 'viewpunishments',
		viewpunishments() {
			checkAccess(this);
			let buf = `<strong>Artemis helpticket punishments</strong><hr />`;
			if (!exports.settings.punishments.length) {
				buf += `None.`;
				return this.sendReplyBox(buf);
			}
			buf += exports.settings.punishments.map(
				(curP, i) => `<strong>${i + 1}:</strong> ${visualizePunishment(curP)}`
			).join('<br />');
			return this.sendReplyBox(buf);
		},
		togglepunishments(target, room, user) {
			checkAccess(this);
			let message;
			if (this.meansYes(target)) {
				if (exports.settings.applyPunishments) {
					return this.errorReply(`Automatic punishments are already enabled.`);
				}
				exports.settings.applyPunishments = true;
				message = `${user.name} enabled automatic punishments for the Artemis ticket handler`;
			} else if (this.meansNo(target)) {
				if (!exports.settings.applyPunishments) {
					return this.errorReply(`Automatic punishments are already disabled.`);
				}
				exports.settings.applyPunishments = false;
				message = `${user.name} disabled automatic punishments for the Artemis ticket handler`;
			} else {
				return this.errorReply(`Invalid setting. Must be 'on' or 'off'.`);
			}
			this.privateGlobalModAction(message);
			this.globalModlog(`AUTOHELPTICKET TOGGLE`, null, exports.settings.applyPunishments ? 'on' : 'off');
			saveSettings();
		},
		stats(target) {
			if (!target) target = Chat.toTimestamp(new Date()).split(' ')[0];
			return this.parse(`/j view-autohelpticket-stats-${target}`);
		},
		logs(target) {
			if (!target) target = Chat.toTimestamp(new Date()).split(' ')[0];
			return this.parse(`/j view-autohelpticket-logs-${target}`);
		},
		resolve(target, room, user) {
			this.checkCan('lock');
			const [ticketId, result] = _lib.Utils.splitFirst(target, ',').map(toID);
			const ticket = _helptickets.tickets[ticketId];
			if (!_optionalChain([ticket, 'optionalAccess', _28 => _28.open])) {
				return this.popupReply(`The user '${ticketId}' does not have a ticket open at present.`);
			}
			if (!['success', 'failure'].includes(result)) {
				return this.popupReply(`The result must be 'success' or 'failure'.`);
			}
			(ticket.state ||= {}).recommendResult = result;
			_helptickets.writeTickets.call(void 0, );
			Chat.refreshPageFor(`help-text-${ticketId}`, 'staff');
		},
	},
	autohelptickethelp: [
		`/aht addpunishment [args] - Adds a punishment with the given [args]. Requires: whitelist &`,
		`/aht deletepunishment [index] - Deletes the automatic helpticket punishment at [index]. Requires: whitelist &`,
		`/aht viewpunishments - View automatic helpticket punishments. Requires: whitelist &`,
		`/aht togglepunishments [on | off] - Turn [on | off] automatic helpticket punishments. Requires: whitelist &`,
		`/aht stats - View success rates of the Artemis ticket handler. Requires: whitelist &`,
	],
}; exports.commands = commands;

 const pages = {
	autohelpticket: {
		async stats(query, user) {
			checkAccess(this);
			let month;
			if (query.length) {
				month = _optionalChain([/[0-9]{4}-[0-9]{2}/, 'access', _29 => _29.exec, 'call', _30 => _30(query.join('-')), 'optionalAccess', _31 => _31[0]]);
			} else {
				month = Chat.toTimestamp(new Date()).split(' ')[0].slice(0, -3);
			}
			if (!month) {
				return this.errorReply(`Invalid month. Must be in YYYY-MM format.`);
			}

			this.title = `[Artemis Ticket Stats] ${month}`;
			this.setHTML(`<div class="pad"><h3>Artemis ticket stats</h3><hr />Searching...`);

			const found = await _helptickets.HelpTicket.getTextLogs(['recommendResult'], month);
			const percent = (numerator, denom) => Math.floor((numerator / denom) * 100);

			let buf = `<div class="pad">`;
			buf += `<button style="float:right;" class="button" name="send" value="/join ${this.pageid}">`;
			buf += `<i class="fa fa-refresh"></i> Refresh</button>`;
			buf += `<h3>Artemis ticket stats</h3><hr />`;
			const dayStats = {};
			const total = {successes: 0, failures: 0, total: 0};
			const failed = [];
			for (const ticket of found) {
				const day = Chat.toTimestamp(new Date(ticket.created)).split(' ')[0];
				if (!dayStats[day]) dayStats[day] = {successes: 0, failures: 0, total: 0};
				dayStats[day].total++;
				total.total++;
				switch (ticket.state.recommendResult) {
				case 'success':
					dayStats[day].successes++;
					total.successes++;
					break;
				case 'failure':
					dayStats[day].failures++;
					total.failures++;
					failed.push([ticket.userid, ticket.type]);
					break;
				}
			}
			buf += `<strong>Total:</strong> ${total.total}<br />`;
			buf += `<strong>Success rate:</strong> ${percent(total.successes, total.total)}% (${total.successes})<br />`;
			buf += `<strong>Failure rate:</strong> ${percent(total.failures, total.total)}% (${total.failures})<br />`;
			buf += `<strong>Day stats:</strong><br />`;
			buf += `<div class="ladder pad"><table>`;
			let header = '';
			let data = '';
			const sortedDays = _lib.Utils.sortBy(Object.keys(dayStats), d => new Date(d).getTime());
			for (const [i, day] of sortedDays.entries()) {
				const cur = dayStats[day];
				if (!cur.total) continue;
				header += `<th>${day.split('-')[2]} (${cur.total})</th>`;
				data += `<td><small>${cur.successes} (${percent(cur.successes, cur.total)}%)`;
				if (cur.failures) {
					data += ` | ${cur.failures} (${percent(cur.failures, cur.total)}%)`;
				} else { // so one cannot confuse dead tickets & false hit tickets
					data += ' | 0 (0%)';
				}
				data += '</small></td>';
				// i + 1 ensures it's above 0 always (0 % 5 === 0)
				if ((i + 1) % 5 === 0 && sortedDays[i + 1]) {
					buf += `<tr>${header}</tr><tr>${data}</tr>`;
					buf += `</div></table>`;
					buf += `<div class="ladder pad"><table>`;
					header = '';
					data = '';
				}
			}
			buf += `<tr>${header}</tr><tr>${data}</tr>`;
			buf += `</div></table>`;
			buf += `<br />`;
			if (failed.length) {
				buf += `<details class="readmore"><summary>Marked as inaccurate</summary>`;
				buf += failed.map(([userid, type]) => (
					`<a href="/view-help-text-${userid}">${userid}</a> (${type})`
				)).join('<br />');
				buf += `</details>`;
			}
			return buf;
		},
		async logs(query, user) {
			checkAccess(this);
			let month;
			if (query.length) {
				month = _optionalChain([/[0-9]{4}-[0-9]{2}/, 'access', _32 => _32.exec, 'call', _33 => _33(query.join('-')), 'optionalAccess', _34 => _34[0]]);
			} else {
				month = Chat.toTimestamp(new Date()).split(' ')[0].slice(0, -3);
			}
			if (!month) {
				return this.errorReply(`Invalid month. Must be in YYYY-MM format.`);
			}
			this.title = `[Artemis Ticket Logs]`;
			let buf = `<div class="pad"><h3>Artemis ticket logs</h3><hr />`;
			const allHits = await _helptickets.HelpTicket.getTextLogs(['recommended'], month);
			_lib.Utils.sortBy(allHits, h => -h.created);
			if (allHits.length) {
				buf += `<strong>All hits:</strong><hr />`;
				for (const hit of allHits) {
					if (!hit.recommended) continue; // ???
					buf += `<a href="/view-help-text-${hit.userid}">${hit.userid}</a> (${hit.type}) `;
					buf += `[${Chat.toTimestamp(new Date(hit.created))}]<br />`;
					buf += _lib.Utils.html`&bull; <code><small>${hit.recommended.join(', ')}</small></code><hr />`;
				}
			} else {
				buf += `<div class="message-error">No hits found.</div>`;
			}
			return buf;
		},
	},
}; exports.pages = pages;

 //# sourceMappingURL=sourceMaps/helptickets-auto.js.map