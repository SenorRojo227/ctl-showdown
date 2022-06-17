"use strict";const _jsxFileName = "..\\..\\server\\chat-plugins\\wifi.tsx";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Wi-Fi chat-plugin. Only works in a room with id 'wifi'
 * Handles giveaways in the formats: question, lottery, gts
 * Written by Kris and bumbadadabum, based on the original plugin as written by Codelegend, SilverTactic, DanielCranham
 */

var _lib = require('../../.lib-dist');

Punishments.addRoomPunishmentType({
	type: 'GIVEAWAYBAN',
	desc: 'banned from giveaways',
});

const BAN_DURATION = 7 * 24 * 60 * 60 * 1000;
const RECENT_THRESHOLD = 30 * 24 * 60 * 60 * 1000;

const DATA_FILE = 'config/chat-plugins/wifi.json';
































const defaults = {
	whitelist: [],
	stats: {},
	storedGiveaways: {
		question: [],
		lottery: [],
	},
	submittedGiveaways: {
		question: [],
		lottery: [],
	},
};

 let wifiData = (() => {
	try {
		return JSON.parse(_lib.FS.call(void 0, DATA_FILE).readSync());
	} catch (e) {
		if (e.code !== 'ENOENT') throw e;
		return defaults;
	}
})(); exports.wifiData = wifiData;

function saveData() {
	_lib.FS.call(void 0, DATA_FILE).writeUpdate(() => JSON.stringify(exports.wifiData));
}

// Convert old file type
if (!exports.wifiData.stats && !exports.wifiData.storedGiveaways && !exports.wifiData.submittedGiveaways) {
	// we cast under the assumption that it's the old file format
	const stats = {...exports.wifiData} ;
	exports.wifiData = {...defaults, stats};
	saveData();
}
// ensure the whitelist exists for those who might have the conversion above but not the stats
if (!exports.wifiData.whitelist) exports.wifiData.whitelist = [];

const statNames = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

const gameName = {
	SwSh: 'Sword/Shield',
	BDSP: 'Brilliant Diamond/Shining Pearl',
};
const gameidToGame = {
	swsh: 'SwSh',
	bdsp: 'BDSP',
};

class Giveaway extends Rooms.SimpleRoomGame {
	
	
	
	
	
	
	
	
	
	
	
	
	/**
	 * IP:userid
	 */
	
	
	
	

	constructor(
		host, giver, room, ot, tid, ivs,
		prize, game = 'BDSP', ball, extraInfo
	) {
		// Make into a sub-game if the gts ever opens up again
		super(room);
		this.gaNumber = room.nextGameNumber();
		this.host = host;
		this.giver = giver;
		this.room = room;
		this.ot = ot;
		this.tid = tid;
		this.ball = ball;
		this.extraInfo = extraInfo;
		this.game = game;
		this.ivs = ivs;
		this.prize = prize;
		this.phase = 'pending';

		this.joined = new Map();

		this.timer = null;

		[this.pokemonID, this.sprite] = Giveaway.getSprite(prize);
	}

	destroy() {
		this.clearTimer();
		super.destroy();
	}

	
	generateReminder() {
		return '';
	}

	getStyle() {
		const css = {class: "broadcast-blue"};
		if (this.game === 'BDSP') css.style = {background: '#aa66a9', color: '#fff'};
		return css;
	}

	sendToUser(user, content) {
		user.sendTo(
			this.room,
			Chat.html`|uhtmlchange|giveaway${this.gaNumber}${this.phase}|${React.createElement('div', { ...this.getStyle(), __self: this, __source: {fileName: _jsxFileName, lineNumber: 163}}, content)}`
		);
	}

	send(content, isStart = false) {
		this.room.add(Chat.html`|uhtml|giveaway${this.gaNumber}${this.phase}|${React.createElement('div', { ...this.getStyle(), __self: this, __source: {fileName: _jsxFileName, lineNumber: 168}}, content)}`);
		if (isStart) this.room.add(`|c:|${Math.floor(Date.now() / 1000)}|&|It's ${this.game} giveaway time!`);
		this.room.update();
	}

	changeUhtml(content) {
		this.room.uhtmlchange(`giveaway${this.gaNumber}${this.phase}`, Chat.html`${React.createElement('div', { ...this.getStyle(), __self: this, __source: {fileName: _jsxFileName, lineNumber: 174}}, content)}`);
		this.room.update();
	}

	clearTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	checkJoined(user) {
		for (const [ip, id] of this.joined) {
			if (user.latestIp === ip && !Config.noipchecks) return ip;
			if (user.previousIDs.includes(id)) return id;
		}
		return false;
	}

	kickUser(user) {
		for (const [ip, id] of this.joined) {
			if (user.latestIp === ip && !Config.noipchecks || user.previousIDs.includes(id)) {
				this.sendToUser(user, this.generateReminder());
				this.joined.delete(ip);
			}
		}
	}

	checkExcluded(user) {
		return (
			user === this.giver ||
			!Config.noipchecks && this.giver.ips.includes(user.latestIp) ||
			this.giver.previousIDs.includes(toID(user))
		);
	}

	static checkCanCreate(context, targetUser, type) {
		const user = context.user;
		const isCreate = type === 'create';
		const isForSelf = targetUser.id === user.id;
		if (exports.wifiData.whitelist.includes(user.id) && isCreate && isForSelf) {
			// it being true doesn't matter here, it's just clearer that the user _is_ allowed
			// and it ensures execution stops here so the creation can proceed
			return true;
		}
		if (isCreate && !(isForSelf && user.can('show', null, context.room))) {
			context.checkCan('warn', null, context.room);
		}
		if (!user.can('warn', null, context.room) && !isCreate && !isForSelf) {
			throw new Chat.ErrorMessage(`You can't ${type} giveways for other users.`);
		}
	}

	static checkBanned(room, user) {
		return Punishments.hasRoomPunishType(room, toID(user), 'GIVEAWAYBAN');
	}

	static ban(room, user, reason) {
		Punishments.roomPunish(room, user, {
			type: 'GIVEAWAYBAN',
			id: toID(user),
			expireTime: Date.now() + BAN_DURATION,
			reason,
		});
	}

	static unban(room, user) {
		Punishments.roomUnpunish(room, user.id, 'GIVEAWAYBAN', false);
	}

	static getSprite(set) {
		const species = Dex.species.get(set.species);
		let spriteid = species.spriteid;
		if (species.cosmeticFormes) {
			for (const forme of species.cosmeticFormes.map(toID)) {
				if (toID(set.species).includes(forme)) {
					spriteid += '-' + forme.slice(species.baseSpecies.length);
					break; // We don't want to end up with deerling-summer-spring
				}
			}
		}
		if (!spriteid.includes('-') && species.forme) { // for stuff like unown letters
			spriteid += '-' + toID(species.forme);
		}
		const shiny = set.shiny ? '-shiny' : '';

		const validFemale = [
			'abomasnow', 'aipom', 'ambipom', 'beautifly', 'bibarel', 'bidoof', 'blaziken', 'buizel', 'cacturne', 'camerupt', 'combee',
			'combusken', 'croagunk', 'donphan', 'dustox', 'finneon', 'floatzel', 'frillish', 'gabite', 'garchomp', 'gible', 'girafarig',
			'gligar', 'golbat', 'gulpin', 'heracross', 'hippopotas', 'hippowdon', 'houndoom', 'indeedee', 'jellicent', 'kerfluffle', 'kitsunoh',
			'kricketot', 'kricketune', 'ledian', 'ledyba', 'ludicolo', 'lumineon', 'luxio', 'luxray', 'magikarp', 'mamoswine', 'medicham',
			'meditite', 'meganium', 'meowstic', 'milotic', 'murkrow', 'nidoran', 'numel', 'nuzleaf', 'octillery', 'pachirisu', 'pikachu',
			'pikachu-starter', 'piloswine', 'politoed', 'protowatt', 'pyroar', 'quagsire', 'raticate', 'rattata', 'relicanth', 'rhydon',
			'rhyperior', 'roselia', 'roserade', 'rotom', 'scizor', 'scyther', 'shiftry', 'shinx', 'sneasel', 'snover', 'staraptor', 'staravia',
			'starly', 'steelix', 'sudowoodo', 'swalot', 'tangrowth', 'torchic', 'toxicroak', 'unfezant', 'unown', 'ursaring', 'voodoom',
			'weavile', 'wobbuffet', 'wooper', 'xatu', 'zubat',
		];
		if (set.gender === 'F' && validFemale.includes(species.id)) spriteid += '-f';
		return [
			species.id,
			React.createElement('img', { src: `/sprites/ani${shiny}/${spriteid}.gif`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 274}} ),
		];
	}

	static updateStats(pokemonIDs) {
		for (const mon of pokemonIDs) {
			if (!exports.wifiData.stats[mon]) exports.wifiData.stats[mon] = [];
			exports.wifiData.stats[mon].push(Date.now());
		}
		saveData();
	}

	// Wi-Fi uses special IV syntax to show hyper trained IVs
	static convertIVs(setObj, ivs) {
		let set = Teams.exportSet(setObj);
		let ivsStr = '';
		if (ivs.length) {
			const convertedIVs = {hp: '31', atk: '31', def: '31', spa: '31', spd: '31', spe: '31'};
			for (const [i, iv] of ivs.entries()) {
				const numStr = iv.trim().split(' ')[0];
				const statName = statNames[i];
				convertedIVs[toID(statName) ] = numStr;
			}
			const array = Object.keys(convertedIVs).map((x, i) => `${convertedIVs[x ]} ${statNames[i]}`);
			ivsStr = `IVs: ${array.join(' / ')}  `;
		}
		if (ivsStr) {
			if (/\nivs:/i.test(set)) {
				const arr = set.split('\n');
				const index = arr.findIndex(x => /^ivs:/i.test(x));
				arr[index] = ivsStr;
				set = arr.join('\n');
			} else if (/nature\n/i.test(set)) {
				const arr = set.split('\n');
				const index = arr.findIndex(x => /nature$/i.test(x));
				arr.splice(index + 1, 0, ivsStr);
				set = arr.join('\n');
			} else {
				set += `\n${ivsStr}`;
			}
		}
		return set;
	}

	generateWindow(rightSide) {
		const set = Giveaway.convertIVs(this.prize, this.ivs);
		return React.createElement('center', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 320}}
, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 321}}, "It's " , this.game, " giveaway time!"  )
, React.createElement('small', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 322}}, "Giveaway started by "   , this.host.name)
, React.createElement('table', { style: {marginLeft: 'auto', marginRight: 'auto'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 323}}
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 324}}
, React.createElement('td', { colSpan: 2, style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 325}}
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 326}}, "Giver:"), " " , this.giver.name, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 326}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 327}}, "OT:"), " " , this.ot, ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 327}}, "TID:"), " " , this.tid
)
)
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 330}}
, React.createElement('td', { style: {textAlign: 'center', width: '45%'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 331}}
, React.createElement('psicon', { item: this.ball, __self: this, __source: {fileName: _jsxFileName, lineNumber: 332}} ), " " , this.sprite, " " , React.createElement('psicon', { item: this.ball, __self: this, __source: {fileName: _jsxFileName, lineNumber: 332}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 332}} )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 333}}, set)
)
, React.createElement('td', { style: {textAlign: 'center', width: '45%'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 335}}, rightSide)
)
, !!_optionalChain([this, 'access', _ => _.extraInfo, 'optionalAccess', _2 => _2.trim, 'call', _3 => _3(), 'access', _4 => _4.length]) && React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 337}}
, React.createElement('td', { colSpan: 2, style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 338}}
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 339}}, "Extra Information" ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 339}} )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 340}}, this.extraInfo.trim().replace(/<br \/>/g, '\n'))
)
)
)
, React.createElement('p', { style: {textAlign: 'center', fontSize: '7pt', fontWeight: 'bold'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 344}}
, React.createElement('u', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 345}}, "Note:"), " You must have a Switch, Pokémon "       , gameName[this.game], ", " , "and Nintendo Switch Online to receive the prize. "
        , "Do not join if you are currently unable to trade. Do not enter if you have already won this exact Pokémon, "
                     , "unless it is explicitly allowed."

)
);
	}
}

 class QuestionGiveaway extends Giveaway {
	
	
	
	/** userid: number of guesses */
	
	

	constructor(
		host, giver, room, ot, tid, game, ivs,
		prize, question, answers, ball, extraInfo
	) {
		super(host, giver, room, ot, tid, ivs, prize, game, ball, extraInfo);
		this.type = 'question';
		this.phase = 'pending';

		this.question = question;
		this.answers = QuestionGiveaway.sanitizeAnswers(answers);
		this.answered = new _lib.Utils.Multiset();
		this.winner = null;
		this.send(this.generateWindow('The question will be displayed in one minute! Use /guess to answer.'), true);

		this.timer = setTimeout(() => this.start(), 1000 * 60);
	}

	static splitTarget(
		target, sep = '|', context,
		user, type
	) {
		let [
			giver, ot, tid, game, question, answers, ivs, ball, extraInfo, ...prize
		] = target.split(sep).map(param => param.trim());
		if (!(giver && ot && tid && _optionalChain([prize, 'optionalAccess', _5 => _5.length]) && question && _optionalChain([answers, 'optionalAccess', _6 => _6.split, 'call', _7 => _7(','), 'access', _8 => _8.length]))) {
			context.parse(`/help giveaway`);
			throw new Chat.Interruption();
		}
		const targetUser = Users.get(giver);
		if (!_optionalChain([targetUser, 'optionalAccess', _9 => _9.connected])) throw new Chat.ErrorMessage(`User '${giver}' is not online.`);

		Giveaway.checkCanCreate(context, targetUser, type);

		if (!!ivs && ivs.split('/').length !== 6) {
			throw new Chat.ErrorMessage(`If you provide IVs, they must be provided for all stats.`);
		}
		if (!game) game = 'BDSP';
		game = gameidToGame[toID(game)] || game ;
		if (!game || !['BDSP', 'SwSh'].includes(game)) throw new Chat.ErrorMessage(`The game must be "BDSP" or "SwSh".`);
		if (!ball) ball = 'pokeball';
		if (!toID(ball).endsWith('ball')) ball = toID(ball) + 'ball';
		if (!Dex.items.get(ball).isPokeball) {
			throw new Chat.ErrorMessage(`${Dex.items.get(ball).name} is not a Pok\u00e9 Ball.`);
		}
		tid = toID(tid);
		if (isNaN(parseInt(tid)) || tid.length < 5 || tid.length > 6) throw new Chat.ErrorMessage("Invalid TID");
		if (!targetUser.autoconfirmed) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' needs to be autoconfirmed to give something away.`);
		}
		if (Giveaway.checkBanned(context.room, targetUser)) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' is giveaway banned.`);
		}
		return {
			targetUser, ot, tid, game: game , question, answers: answers.split(','),
			ivs: ivs.split('/'), ball, extraInfo, prize: prize.join('|'),
		};
	}

	generateQuestion() {
		return this.generateWindow(React.createElement(React.Fragment, null
, React.createElement('p', { style: {textAlign: 'center', fontSize: '13pt'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 422}}, "Giveaway Question: "  , React.createElement('b', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 422}}, this.question))
, React.createElement('p', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 423}}, "use /guess to answer."   )
));
	}

	start() {
		this.changeUhtml(React.createElement('p', { style: {textAlign: 'center', fontSize: '13pt', fontWeight: 'bold'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 428}}, "The giveaway has started! Scroll down to see the question."

));
		this.phase = 'started';
		this.send(this.generateQuestion());
		this.timer = setTimeout(() => this.end(false), 1000 * 60 * 5);
	}

	choose(user, guess) {
		if (this.phase !== 'started') return user.sendTo(this.room, "The giveaway has not started yet.");

		if (this.checkJoined(user) && ![...this.joined.values()].includes(user.id)) {
			return user.sendTo(this.room, "You have already joined the giveaway.");
		}
		if (Giveaway.checkBanned(this.room, user)) return user.sendTo(this.room, "You are banned from entering giveaways.");
		if (this.checkExcluded(user)) return user.sendTo(this.room, "You are disallowed from entering the giveaway.");

		if ((_nullishCoalesce(this.answered.get(user.id), () => ( 0))) >= 3) {
			return user.sendTo(
				this.room,
				"You have already guessed three times. You cannot guess anymore in this.giveaway."
			);
		}

		const sanitized = toID(guess);

		for (const answer of this.answers.map(toID)) {
			if (answer === sanitized) {
				this.winner = user;
				this.clearTimer();
				return this.end(false);
			}
		}

		this.joined.set(user.latestIp, user.id);
		this.answered.add(user.id);
		if ((_nullishCoalesce(this.answered.get(user.id), () => ( 0))) >= 3) {
			user.sendTo(
				this.room,
				`Your guess '${guess}' is wrong. You have used up all of your guesses. Better luck next time!`
			);
		} else {
			user.sendTo(this.room, `Your guess '${guess}' is wrong. Try again!`);
		}
	}

	change(value, user, answer = false) {
		if (user.id !== this.host.id) return user.sendTo(this.room, "Only the host can edit the giveaway.");
		if (this.phase !== 'pending') {
			return user.sendTo(this.room, "You cannot change the question or answer once the giveaway has started.");
		}
		if (!answer) {
			this.question = value;
			return user.sendTo(this.room, `The question has been changed to ${value}.`);
		}
		const ans = QuestionGiveaway.sanitizeAnswers(value.split(',').map(val => val.trim()));
		if (!ans.length) {
			return user.sendTo(this.room, "You must specify at least one answer and it must not contain any special characters.");
		}
		this.answers = ans;
		user.sendTo(this.room, `The answer${Chat.plural(ans, "s have", "has")} been changed to ${ans.join(', ')}.`);
	}

	end(force) {
		const style = {textAlign: 'center', fontSize: '13pt', fontWeight: 'bold'};
		if (force) {
			this.clearTimer();
			this.changeUhtml(React.createElement('p', { style: style, __self: this, __source: {fileName: _jsxFileName, lineNumber: 495}}, "The giveaway was forcibly ended."    ));
			this.room.send("The giveaway was forcibly ended.");
		} else {
			if (!this.winner) {
				this.changeUhtml(React.createElement('p', { style: style, __self: this, __source: {fileName: _jsxFileName, lineNumber: 499}}, "The giveaway was forcibly ended."    ));
				this.room.send("The giveaway has been forcibly ended as no one has answered the question.");
			} else {
				this.changeUhtml(React.createElement('p', { style: style, __self: this, __source: {fileName: _jsxFileName, lineNumber: 502}}, "The giveaway has ended! Scroll down to see the answer."         ));
				this.phase = 'ended';
				this.clearTimer();
				this.room.modlog({
					action: 'GIVEAWAY WIN',
					userid: this.winner.id,
					note: `${this.giver.name}'s giveaway for a "${this.prize.species}" (OT: ${this.ot} TID: ${this.tid})`,
				});
				this.send(this.generateWindow(React.createElement(React.Fragment, null
, React.createElement('p', { style: {textAlign: 'center', fontSize: '12pt'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 511}}
, React.createElement('b', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 512}}, this.winner.name), " won the giveaway! Congratulations!"
)
, React.createElement('p', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 514}}
, this.question, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 515}} ), "Correct answer"
 , Chat.plural(this.answers), ": " , this.answers.join(', ')
)
)));
				this.winner.sendTo(
					this.room,
					`|raw|You have won the giveaway. PM <b>${_lib.Utils.escapeHTML(this.giver.name)}</b> to claim your prize!`
				);
				if (this.winner.connected) {
					this.winner.popup(`You have won the giveaway. PM **${this.giver.name}** to claim your prize!`);
				}
				if (this.giver.connected) this.giver.popup(`${this.winner.name} has won your question giveaway!`);
				Giveaway.updateStats(new Set([this.pokemonID]));
			}
		}

		this.destroy();
	}

	static sanitize(str) {
		return str.toLowerCase().replace(/[^a-z0-9 .-]+/ig, "").trim();
	}

	static sanitizeAnswers(answers) {
		return answers.map(
			val => QuestionGiveaway.sanitize(val)
		).filter(
			(val, index, array) => toID(val).length && array.indexOf(val) === index
		);
	}

	checkExcluded(user) {
		if (user === this.host) return true;
		if (this.host.ips.includes(user.latestIp) && !Config.noipchecks) return true;
		if (this.host.previousIDs.includes(toID(user))) return true;
		return super.checkExcluded(user);
	}
} exports.QuestionGiveaway = QuestionGiveaway;

 class LotteryGiveaway extends Giveaway {
	
	
	

	constructor(
		host, giver, room, ot, tid, ivs,
		game, prize, winners, ball, extraInfo
	) {
		super(host, giver, room, ot, tid, ivs, prize, game, ball, extraInfo);

		this.type = 'lottery';
		this.phase = 'pending';

		this.winners = [];

		this.maxWinners = winners || 1;

		this.send(this.generateReminder(false), true);

		this.timer = setTimeout(() => this.drawLottery(), 1000 * 60 * 2);
	}

	static splitTarget(
		target, sep = '|', context,
		user, type
	) {
		let [giver, ot, tid, game, winners, ivs, ball, extraInfo, ...prize] = target.split(sep).map(param => param.trim());
		if (!(giver && ot && tid && _optionalChain([prize, 'optionalAccess', _10 => _10.length]))) {
			context.parse(`/help giveaway`);
			throw new Chat.Interruption();
		}
		const targetUser = Users.get(giver);
		if (!_optionalChain([targetUser, 'optionalAccess', _11 => _11.connected])) throw new Chat.ErrorMessage(`User '${giver}' is not online.`);

		Giveaway.checkCanCreate(context, user, type);

		if (!!ivs && ivs.split('/').length !== 6) {
			throw new Chat.ErrorMessage(`If you provide IVs, they must be provided for all stats.`);
		}
		if (!game) game = 'BDSP';
		game = gameidToGame[toID(game)] || game ;
		if (!game || !['BDSP', 'SwSh'].includes(game)) throw new Chat.ErrorMessage(`The game must be "BDSP" or "SwSh".`);
		if (!ball) ball = 'pokeball';
		if (!toID(ball).endsWith('ball')) ball = toID(ball) + 'ball';
		if (!Dex.items.get(ball).isPokeball) {
			throw new Chat.ErrorMessage(`${Dex.items.get(ball).name} is not a Pok\u00e9 Ball.`);
		}
		tid = toID(tid);
		if (isNaN(parseInt(tid)) || tid.length < 5 || tid.length > 6) throw new Chat.ErrorMessage("Invalid TID");
		if (!targetUser.autoconfirmed) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' needs to be autoconfirmed to give something away.`);
		}
		if (Giveaway.checkBanned(context.room, targetUser)) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' is giveaway banned.`);
		}

		let numWinners = 1;
		if (winners) {
			numWinners = parseInt(winners);
			if (isNaN(numWinners) || numWinners < 1 || numWinners > 5) {
				throw new Chat.ErrorMessage("The lottery giveaway can have a minimum of 1 and a maximum of 5 winners.");
			}
		}
		return {
			targetUser, ot, tid, game: game , winners: numWinners,
			ivs: ivs.split('/'), ball, extraInfo, prize: prize.join('|'),
		};
	}

	generateReminder(joined = false) {
		const cmd = (joined ? 'Leave' : 'Join');
		return this.generateWindow(React.createElement(React.Fragment, null, "The lottery drawing will occur in 2 minutes, and with "
          , Chat.count(this.maxWinners, "winners"), "!", React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 627}} )
, React.createElement('button', { class: "button", name: "send", value: `/giveaway ${toID(cmd)}lottery`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 628}}, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 628}}, cmd))
));
	}

	display() {
		const joined = this.generateReminder(true);
		const notJoined = this.generateReminder();

		for (const i in this.room.users) {
			const thisUser = this.room.users[i];
			if (this.checkJoined(thisUser)) {
				this.sendToUser(thisUser, joined);
			} else {
				this.sendToUser(thisUser, notJoined);
			}
		}
	}

	addUser(user) {
		if (this.phase !== 'pending') return user.sendTo(this.room, "The join phase of the lottery giveaway has ended.");

		if (!user.named) return user.sendTo(this.room, "You need to choose a name before joining a lottery giveaway.");
		if (this.checkJoined(user)) return user.sendTo(this.room, "You have already joined the giveaway.");
		if (Giveaway.checkBanned(this.room, user)) return user.sendTo(this.room, "You are banned from entering giveaways.");
		if (this.checkExcluded(user)) return user.sendTo(this.room, "You are disallowed from entering the giveaway.");

		this.joined.set(user.latestIp, user.id);
		this.sendToUser(user, this.generateReminder(true));
		user.sendTo(this.room, "You have successfully joined the lottery giveaway.");
	}

	removeUser(user) {
		if (this.phase !== 'pending') return user.sendTo(this.room, "The join phase of the lottery giveaway has ended.");
		if (!this.checkJoined(user)) return user.sendTo(this.room, "You have not joined the lottery giveaway.");
		for (const [ip, id] of this.joined) {
			if (ip === user.latestIp && !Config.noipchecks || id === user.id) {
				this.joined.delete(ip);
			}
		}
		this.sendToUser(user, this.generateReminder(false));
		user.sendTo(this.room, "You have left the lottery giveaway.");
	}

	drawLottery() {
		this.clearTimer();

		const userlist = [...this.joined.values()];
		if (userlist.length === 0) {
			this.changeUhtml(React.createElement('p', { style: {textAlign: 'center', fontSize: '13pt', fontWeight: 'bold'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 676}}, "The giveaway was forcibly ended."

));
			this.room.send("The giveaway has been forcibly ended as there are no participants.");
			return this.destroy();
		}

		while (this.winners.length < this.maxWinners && userlist.length > 0) {
			const winner = Users.get(userlist.splice(Math.floor(Math.random() * userlist.length), 1)[0]);
			if (!winner) continue;
			this.winners.push(winner);
		}
		this.end();
	}

	end(force = false) {
		const style = {textAlign: 'center', fontSize: '13pt', fontWeight: 'bold'};
		if (force) {
			this.clearTimer();
			this.changeUhtml(React.createElement('p', { style: style, __self: this, __source: {fileName: _jsxFileName, lineNumber: 695}}, "The giveaway was forcibly ended."    ));
			this.room.send("The giveaway was forcibly ended.");
		} else {
			this.changeUhtml(React.createElement('p', { style: style, __self: this, __source: {fileName: _jsxFileName, lineNumber: 698}}, "The giveaway has ended! Scroll down to see the winner"
         , Chat.plural(this.winners), "."
));
			this.phase = 'ended';
			const winnerNames = this.winners.map(winner => winner.name).join(', ');
			this.room.modlog({
				action: 'GIVEAWAY WIN',
				note: `${winnerNames} won ${this.giver.name}'s giveaway for "${this.prize}" (OT: ${this.ot} TID: ${this.tid})`,
			});
			this.send(this.generateWindow(React.createElement(React.Fragment, null
, React.createElement('p', { style: {textAlign: 'center', fontSize: '10pt', fontWeight: 'bold'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 708}}, "Lottery Draw" )
, React.createElement('p', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 709}}, Chat.count(this.joined.size, 'users'), " joined the giveaway."   , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 709}} ), "Our lucky winner"
  , Chat.plural(this.winners), ": " , React.createElement('b', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 710}}, winnerNames), "!", React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 710}} ), "Congratulations!")
)));
			for (const winner of this.winners) {
				winner.sendTo(
					this.room,
					`|raw|You have won the lottery giveaway! PM <b>${this.giver.name}</b> to claim your prize!`
				);
				if (winner.connected) {
					winner.popup(`You have won the lottery giveaway! PM **${this.giver.name}** to claim your prize!`);
				}
			}
			if (this.giver.connected) this.giver.popup(`The following users have won your lottery giveaway:\n${winnerNames}`);
			Giveaway.updateStats(new Set([this.pokemonID]));
		}
		this.destroy();
	}
} exports.LotteryGiveaway = LotteryGiveaway;

 class GTS extends Rooms.SimpleRoomGame {
	
	
	
	
	
	
	
	
	
	
	
	

	constructor(
		room, giver, amount,
		summary, deposit, lookfor
	) {
		// Always a sub-game so tours etc can be ran while GTS games are running
		super(room, true);
		this.gtsNumber = room.nextGameNumber();
		this.room = room;
		this.giver = giver;
		this.left = amount;
		this.summary = summary;
		this.deposit = GTS.linkify(_lib.Utils.escapeHTML(deposit));
		this.lookfor = lookfor;

		// Deprecated, just typed like this to prevent errors, will rewrite when GTS is planned to be used again
		[this.pokemonID, this.sprite] = Giveaway.getSprite({species: summary} );

		this.sent = [];
		this.noDeposits = false;

		this.timer = setInterval(() => this.send(this.generateWindow()), 1000 * 60 * 5);
		this.send(this.generateWindow());
	}

	send(content) {
		this.room.add(Chat.html`|uhtml|gtsga${this.gtsNumber}|${React.createElement('div', { class: "broadcast-blue", __self: this, __source: {fileName: _jsxFileName, lineNumber: 767}}, content)}`);
		this.room.update();
	}

	changeUhtml(content) {
		this.room.uhtmlchange(`gtsga${this.gtsNumber}`, Chat.html`${React.createElement('div', { class: "broadcast-blue", __self: this, __source: {fileName: _jsxFileName, lineNumber: 772}}, content)}`);
		this.room.update();
	}

	clearTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	generateWindow() {
		const sentModifier = this.sent.length ? 5 : 0;
		const rightSide = this.noDeposits ?
			React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 786}}, "More Pokémon have been deposited than there are prizes in this giveaway and new deposits will not be accepted. "
                   , "If you have already deposited a Pokémon, please be patient, and do not withdraw your Pokémon."

) : React.createElement(React.Fragment, null, "To participate, deposit "
   , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 790}}, this.deposit), " into the GTS and look for "       , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 790}}, this.lookfor)
);
		return React.createElement(React.Fragment, null
, React.createElement('p', { style: {textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', marginBottom: '2px'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 793}}, "There is a GTS giveaway going on!"

)
, React.createElement('p', { style: {textAlign: 'center', fontSize: '10pt', marginTop: 0}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 796}}, "Hosted by: "
  , this.giver.name, " | Left: "   , React.createElement('b', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 797}}, this.left)
)
, React.createElement('table', { style: {margin: 'inherit auto'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 799}}
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 800}}
, !!sentModifier && React.createElement('td', { style: {textAlign: 'center', width: '10%'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 801}}
, React.createElement('b', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 802}}, "Last winners:" ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 802}} )
, this.sent.join(React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 803}} ))
)
, React.createElement('td', { style: {textAlign: 'center', width: '15%'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 805}}, this.sprite)
, React.createElement('td', { style: {textAlign: 'center', width: `${40 - sentModifier}%`}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 806}}
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 807}}, this.summary)
)
, React.createElement('td', { style: {textAlign: 'center', width: `${35 - sentModifier}%`}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 809}}, rightSide)
)
)
);
	}

	updateLeft(num) {
		this.left = num;
		if (this.left < 1) return this.end();

		this.changeUhtml(this.generateWindow());
	}

	updateSent(ign) {
		this.left--;
		if (this.left < 1) return this.end();

		this.sent.push(ign);
		if (this.sent.length > 5) this.sent.shift();

		this.changeUhtml(this.generateWindow());
	}

	stopDeposits() {
		this.noDeposits = true;

		this.room.send(Chat.html`|html|${React.createElement('p', { style: {textAlign: 'center', fontSize: '11pt'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 835}}, "More Pokémon have been deposited than there are prizes in this giveaway and new deposits will not be accepted. "
                   , "If you have already deposited a Pokémon, please be patient, and do not withdraw your Pokémon."

)}`);
		this.changeUhtml(this.generateWindow());
	}

	end(force = false) {
		if (force) {
			this.clearTimer();
			this.changeUhtml(
				React.createElement('p', { style: {textAlign: 'center', fontSize: '13pt', fontWeight: 'bold'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 846}}, "The GTS giveaway was forcibly ended."     )
			);
			this.room.send("The GTS giveaway was forcibly ended.");
		} else {
			this.clearTimer();
			this.changeUhtml(
				React.createElement('p', { style: {textAlign: 'center', fontSize: '13pt', fontWeight: 'bold'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 852}}, "The GTS giveaway has finished."    )
			);
			this.room.modlog({
				action: 'GTS FINISHED',
				userid: this.giver.id,
				note: `their GTS giveaway for "${this.summary}"`,
			});
			this.send(React.createElement('p', { style: {textAlign: 'center', fontSize: '11pt'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 859}}, "The GTS giveaway for a \""
     , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 860}}, this.lookfor), "\" has finished."
));
			Giveaway.updateStats(new Set([this.pokemonID]));
		}
		this.room.subGame = null;
		return this.left;
	}

	// This currently doesn't match some of the edge cases the other pokemon matching function does account for
	// (such as Type: Null). However, this should never be used as a fodder mon anyway,
	// so I don't see a huge need to implement it.
	static linkify(text) {
		const parsed = toID(text);

		for (const species of Dex.species.all()) {
			const id = species.id;
			const regexp = new RegExp(`\\b${id}\\b`, 'ig');
			const res = regexp.exec(parsed);
			if (res) {
				const num = String(species.num).padStart(3, '0');
				return React.createElement(React.Fragment, null
, text.slice(0, res.index)
, React.createElement('a', { href: `http://www.serebii.net/pokedex-sm/location/${num}.shtml`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 882}}
, text.slice(res.index, res.index + res[0].length)
)
, text.slice(res.index + res[0].length)
);
			}
		}
		return text;
	}
} exports.GTS = GTS;

function hasSubmittedGiveaway(user) {
	for (const [key, giveaways] of Object.entries(exports.wifiData.submittedGiveaways)) {
		for (const [index, giveaway] of giveaways.entries()) {
			if (user.id === giveaway.targetUserID) {
				return {index, type: key };
			}
		}
	}
	return null;
}

 const handlers = {
	onDisconnect(user) {
		const giveaway = hasSubmittedGiveaway(user);
		if (giveaway) {
			exports.wifiData.submittedGiveaways[giveaway.type].splice(giveaway.index, 1);
			saveData();
		}
	},
}; exports.handlers = handlers;

 const commands = {
	gts: {
		new: 'start',
		create: 'start',
		start(target, room, user) {
			room = this.room = Rooms.search('wifi') || null;
			if (!room) {
				throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
			}
			if (room.getGame(GTS, true)) {
				throw new Chat.ErrorMessage(`There is already a GTS Giveaway going on.`);
			}
			// GTS is currently deprecated until it's no longer behind a paywall
			return this.parse(`/help gts`);
			/*
			const [giver, amountStr, summary, deposit, lookfor] = target.split(target.includes('|') ? '|' : ',').map(
				param => param.trim()
			);
			if (!(giver && amountStr && summary && deposit && lookfor)) {
				return this.errorReply("Invalid arguments specified - /gts start giver | amount | summary | deposit | lookfor");
			}
			const amount = parseInt(amountStr);
			if (!amount || amount < 20 || amount > 100) {
				return this.errorReply("Please enter a valid amount. For a GTS giveaway, you need to give away at least 20 mons, and no more than 100.");
			}
			const targetUser = Users.get(giver);
			if (!targetUser?.connected) return this.errorReply(`User '${giver}' is not online.`);
			this.checkCan('warn', null, room);
			if (!targetUser.autoconfirmed) {
				return this.errorReply(`User '${targetUser.name}' needs to be autoconfirmed to host a giveaway.`);
			}
			if (Giveaway.checkBanned(room, targetUser)) return this.errorReply(`User '${targetUser.name}' is giveaway banned.`);

			room.subGame = new GTS(room, targetUser, amount, summary, deposit, lookfor);

			this.privateModAction(`${user.name} started a GTS giveaway for ${targetUser.name} with ${amount} Pokémon`);
			this.modlog('GTS GIVEAWAY', null, `for ${targetUser.getLastId()} with ${amount} Pokémon`);
			*/
		},
		left(target, room, user) {
			room = this.requireRoom('wifi' );
			const game = this.requireGame(GTS, true);
			if (!user.can('warn', null, room) && user !== game.giver) {
				throw new Chat.ErrorMessage("Only the host or a staff member can update GTS giveaways.");
			}
			if (!target) {
				this.runBroadcast();
				let output = `The GTS giveaway from ${game.giver} has ${game.left} Pokémon remaining!`;
				if (game.sent.length) output += `Last winners: ${game.sent.join(', ')}`;
				return this.sendReply(output);
			}
			const newamount = parseInt(target);
			if (isNaN(newamount)) return this.errorReply("Please enter a valid amount.");
			if (newamount > game.left) return this.errorReply("The new amount must be lower than the old amount.");
			if (newamount < game.left - 1) {
				this.modlog(`GTS GIVEAWAY`, null, `set from ${game.left} to ${newamount} left`);
			}

			game.updateLeft(newamount);
		},
		sent(target, room, user) {
			room = this.requireRoom('wifi' );
			const game = this.requireGame(GTS, true);
			if (!user.can('warn', null, room) && user !== game.giver) {
				return this.errorReply("Only the host or a staff member can update GTS giveaways.");
			}

			if (!target || target.length > 12) return this.errorReply("Please enter a valid IGN.");

			game.updateSent(target);
		},
		full(target, room, user) {
			room = this.requireRoom('wifi' );
			const game = this.requireGame(GTS, true);
			if (!user.can('warn', null, room) && user !== game.giver) {
				return this.errorReply("Only the host or a staff member can update GTS giveaways.");
			}
			if (game.noDeposits) return this.errorReply("The GTS giveaway was already set to not accept deposits.");

			game.stopDeposits();
		},
		end(target, room, user) {
			room = this.requireRoom('wifi' );
			const game = this.requireGame(GTS, true);
			this.checkCan('warn', null, room);

			if (target && target.length > 300) {
				return this.errorReply("The reason is too long. It cannot exceed 300 characters.");
			}
			const amount = game.end(true);
			if (target) target = `: ${target}`;
			this.modlog('GTS END', null, `with ${amount} left${target}`);
			this.privateModAction(`The giveaway was forcibly ended by ${user.name} with ${amount} left${target}`);
		},
	},
	gtshelp: [
		`GTS giveaways are currently disabled. If you are a Room Owner and would like them to be re-enabled, contact Kris.`,
	],
	ga: 'giveaway',
	giveaway: {
		help: '',
		''() {
			this.runBroadcast();
			this.run('giveawayhelp');
		},
		view: {
			''(target, room, user) {
				this.room = room = Rooms.search('wifi') || null;
				if (!room) throw new Chat.ErrorMessage(`The Wi-Fi room doesn't exist on this server.`);
				this.checkCan('warn', null, room);
				this.parse(`/j view-giveaways-default`);
			},
			stored(target, room, user) {
				this.room = room = Rooms.search('wifi') || null;
				if (!room) throw new Chat.ErrorMessage(`The Wi-Fi room doesn't exist on this server.`);
				this.checkCan('warn', null, room);
				this.parse(`/j view-giveaways-stored`);
			},
			submitted(target, room, user) {
				this.room = room = Rooms.search('wifi') || null;
				if (!room) throw new Chat.ErrorMessage(`The Wi-Fi room doesn't exist on this server.`);
				this.checkCan('warn', null, room);
				this.parse(`/j view-giveaways-submitted`);
			},
		},
		rm: 'remind',
		remind(target, room, user) {
			room = this.requireRoom('wifi' );
			this.runBroadcast();
			if (room.getGame(QuestionGiveaway)) {
				const game = room.getGame(QuestionGiveaway);
				if (game.phase !== 'started') {
					throw new Chat.ErrorMessage(`The giveaway has not started yet.`);
				}
				game.send(game.generateQuestion());
			} else if (room.getGame(LotteryGiveaway)) {
				room.getGame(LotteryGiveaway).display();
			} else {
				throw new Chat.ErrorMessage(`There is no giveaway going on right now.`);
			}
		},
		leavelotto: 'join',
		leavelottery: 'join',
		leave: 'join',
		joinlotto: 'join',
		joinlottery: 'join',
		join(target, room, user, conn, cmd) {
			room = this.requireRoom('wifi' );
			this.checkChat();
			if (user.semilocked) return;
			const giveaway = this.requireGame(LotteryGiveaway);
			if (cmd.includes('join')) {
				giveaway.addUser(user);
			} else {
				giveaway.removeUser(user);
			}
		},
		ban(target, room, user) {
			if (!target) return false;
			room = this.requireRoom('wifi' );
			this.checkCan('warn', null, room);

			const {targetUser, rest: reason} = this.requireUser(target, {allowOffline: true});
			if (reason.length > 300) {
				return this.errorReply("The reason is too long. It cannot exceed 300 characters.");
			}
			if (Punishments.hasRoomPunishType(room, targetUser.name, 'GIVEAWAYBAN')) {
				return this.errorReply(`User '${targetUser.name}' is already giveawaybanned.`);
			}

			Giveaway.ban(room, targetUser, reason);
			_optionalChain([(room.getGame(LotteryGiveaway) || room.getGame(QuestionGiveaway)), 'optionalAccess', _12 => _12.kickUser, 'call', _13 => _13(targetUser)]);
			this.modlog('GIVEAWAYBAN', targetUser, reason);
			const reasonMessage = reason ? ` (${reason})` : ``;
			this.privateModAction(`${targetUser.name} was banned from entering giveaways by ${user.name}.${reasonMessage}`);
		},
		unban(target, room, user) {
			if (!target) return false;
			room = this.requireRoom('wifi' );
			this.checkCan('warn', null, room);

			const {targetUser} = this.requireUser(target, {allowOffline: true});
			if (!Giveaway.checkBanned(room, targetUser)) {
				return this.errorReply(`User '${targetUser.name}' isn't banned from entering giveaways.`);
			}

			Giveaway.unban(room, targetUser);
			this.privateModAction(`${targetUser.name} was unbanned from entering giveaways by ${user.name}.`);
			this.modlog('GIVEAWAYUNBAN', targetUser, null, {noip: 1, noalts: 1});
		},
		new: 'create',
		start: 'create',
		create: {
			''(target, room, user) {
				room = this.requireRoom('wifi' );
				if (!user.can('show', null, room)) this.checkCan('warn', null, room);
				this.parse('/j view-giveaways-create');
			},
			question(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				if (room.game) {
					throw new Chat.ErrorMessage(`There is already a room game (${room.game.constructor.name}) going on.`);
				}
				// Syntax: giver|ot|tid|game|question|answer1,answer2,etc|ivs/format/like/this|pokeball|packed set
				const {
					targetUser, ot, tid, game, question, answers, ivs, ball, extraInfo, prize,
				} = QuestionGiveaway.splitTarget(target, '|', this, user, 'create');
				const set = _optionalChain([Teams, 'access', _14 => _14.import, 'call', _15 => _15(prize), 'optionalAccess', _16 => _16[0]]);
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				room.game = new QuestionGiveaway(user, targetUser, room, ot, tid, game, ivs, set, question, answers, ball, extraInfo);

				this.privateModAction(`${user.name} started a question giveaway for ${targetUser.name}.`);
				this.modlog('QUESTION GIVEAWAY', null, `for ${targetUser.getLastId()}`);
			},
			lottery(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				if (room.game) throw new Chat.ErrorMessage(`There is already a room game (${room.game.constructor.name}) going on.`);
				// Syntax: giver|ot|tid|game|# of winners|ivs/like/this|pokeball|info|packed set
				const {
					targetUser, ot, tid, game, winners, ivs, ball, prize, extraInfo,
				} = LotteryGiveaway.splitTarget(target, '|', this, user, 'create');
				const set = _optionalChain([Teams, 'access', _17 => _17.import, 'call', _18 => _18(prize), 'optionalAccess', _19 => _19[0]]);
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				room.game = new LotteryGiveaway(user, targetUser, room, ot, tid, ivs, game, set, winners, ball, extraInfo);

				this.privateModAction(`${user.name} started a lottery giveaway for ${targetUser.name}.`);
				this.modlog('LOTTERY GIVEAWAY', null, `for ${targetUser.getLastId()}`);
			},
		},
		stop: 'end',
		end(target, room, user) {
			room = this.requireRoom('wifi' );
			if (!_optionalChain([room, 'access', _20 => _20.game, 'optionalAccess', _21 => _21.constructor, 'access', _22 => _22.name, 'access', _23 => _23.includes, 'call', _24 => _24('Giveaway')])) {
				throw new Chat.ErrorMessage(`There is no giveaway going on at the moment.`);
			}
			const game = room.game ;
			if (user.id !== game.host.id) this.checkCan('warn', null, room);

			if (target && target.length > 300) {
				return this.errorReply("The reason is too long. It cannot exceed 300 characters.");
			}
			game.end(true);
			this.modlog('GIVEAWAY END', null, target);
			if (target) target = `: ${target}`;
			this.privateModAction(`The giveaway was forcibly ended by ${user.name}${target}`);
		},
		guess(target, room, user) {
			this.parse(`/guess ${target}`);
		},
		changeanswer: 'changequestion',
		changequestion(target, room, user, connection, cmd) {
			room = this.requireRoom('wifi' );
			const giveaway = this.requireGame(QuestionGiveaway);
			target = target.trim();
			if (!target) throw new Chat.ErrorMessage("You must include a question or an answer.");
			giveaway.change(target, user, cmd.includes('answer'));
		},
		showanswer: 'viewanswer',
		viewanswer(target, room, user) {
			room = this.requireRoom('wifi' );
			const giveaway = this.requireGame(QuestionGiveaway);
			if (user.id !== giveaway.host.id && user.id !== giveaway.giver.id) return;

			this.sendReply(`The giveaway question is ${giveaway.question}.\nThe answer${Chat.plural(giveaway.answers, 's are', ' is')} ${giveaway.answers.join(', ')}.`);
		},
		save: 'store',
		store: {
			''(target, room, user) {
				room = this.requireRoom('wifi' );
				this.checkCan('warn', null, room);
				this.parse('/j view-giveaways-stored-add');
			},
			question(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, question, answers, ball, extraInfo, ivs,
				} = QuestionGiveaway.splitTarget(target, '|', this, user, 'store');
				const set = _optionalChain([Teams, 'access', _25 => _25.import, 'call', _26 => _26(prize), 'optionalAccess', _27 => _27[0]]);
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!exports.wifiData.storedGiveaways.question) exports.wifiData.storedGiveaways.question = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, question, answers, ivs, ball, extraInfo};
				exports.wifiData.storedGiveaways.question.push(data);
				saveData();

				this.privateModAction(`${user.name} saved a question giveaway for ${targetUser.name}.`);
				this.modlog('QUESTION GIVEAWAY SAVE');
			},
			lottery(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, winners, ball, extraInfo, ivs,
				} = LotteryGiveaway.splitTarget(target, '|', this, user, 'store');
				const set = _optionalChain([Teams, 'access', _28 => _28.import, 'call', _29 => _29(prize), 'optionalAccess', _30 => _30[0]]);
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!exports.wifiData.storedGiveaways.lottery) exports.wifiData.storedGiveaways.lottery = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, winners, ball, extraInfo, ivs};
				exports.wifiData.storedGiveaways.lottery.push(data);
				saveData();

				this.privateModAction(`${user.name} saved a lottery giveaway for ${targetUser.name}.`);
				this.modlog('LOTTERY GIVEAWAY SAVE');
			},
		},
		submit: {
			''(target, room, user) {
				room = this.requireRoom('wifi' );
				this.checkChat();
				this.parse('/j view-giveaways-submitted-add');
			},
			question(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, question, answers, ball, extraInfo, ivs,
				} = QuestionGiveaway.splitTarget(target, '|', this, user, 'submit');
				const set = _optionalChain([Teams, 'access', _31 => _31.import, 'call', _32 => _32(prize), 'optionalAccess', _33 => _33[0]]);
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!exports.wifiData.submittedGiveaways.question) exports.wifiData.submittedGiveaways.question = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, question, answers, ball, extraInfo, ivs};
				exports.wifiData.submittedGiveaways.question.push(data);
				saveData();

				this.sendReply(`You have submitted a question giveaway for ${set.species}. If you log out or go offline, the giveaway won't go through.`);
				const message = `|tempnotify|pendingapprovals|Pending question giveaway request!` +
					`|${user.name} has requested to start a question giveaway for ${set.species}.|new question giveaway request`;
				room.sendRankedUsers(message, '%');
				room.sendMods(
					Chat.html`|uhtml|giveaway-request-${user.id}|${React.createElement('div', { class: "infobox", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1260}}
, user.name, " wants to start a question giveaway for "        , set.species, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1261}} )
, React.createElement('button', { class: "button", name: "send", value: "/j view-giveaways-submitted" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1262}}, "View pending giveaways"  )
)}`
				);
			},
			lottery(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, winners, ball, extraInfo, ivs,
				} = LotteryGiveaway.splitTarget(target, '|', this, user, 'submit');
				const set = _optionalChain([Teams, 'access', _34 => _34.import, 'call', _35 => _35(prize), 'optionalAccess', _36 => _36[0]]);
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!exports.wifiData.submittedGiveaways.lottery) exports.wifiData.submittedGiveaways.lottery = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, winners, ball, extraInfo, ivs};
				exports.wifiData.submittedGiveaways.lottery.push(data);
				saveData();

				this.sendReply(`You have submitted a lottery giveaway for ${set.species}. If you log out or go offline, the giveaway won't go through.`);
				const message = `|tempnotify|pendingapprovals|Pending lottery giveaway request!` +
					`|${user.name} has requested to start a lottery giveaway for ${set.species}.|new lottery giveaway request`;
				room.sendRankedUsers(message, '%');
				room.sendMods(Chat.html`|uhtml|giveaway-request-${user.id}|${React.createElement('div', { class: "infobox", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1286}}
, user.name, " wants to start a lottery giveaway for "        , set.species, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1287}} )
, React.createElement('button', { class: "button", name: "send", value: "/j view-giveaways-submitted" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1288}}, "View pending giveaways"  )
)}`);
			},
		},
		approve(target, room, user) {
			room = this.room = Rooms.search('wifi') || null;
			if (!room) {
				throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
			}
			const targetUser = Users.get(target);
			if (!_optionalChain([targetUser, 'optionalAccess', _37 => _37.connected])) {
				this.refreshPage('giveaways-submitted');
				throw new Chat.ErrorMessage(`${_optionalChain([targetUser, 'optionalAccess', _38 => _38.name]) || toID(target)} is offline, so their giveaway can't be run.`);
			}
			const hasGiveaway = hasSubmittedGiveaway(targetUser);
			if (!hasGiveaway) {
				this.refreshPage('giveaways-submitted');
				throw new Chat.ErrorMessage(`${_optionalChain([targetUser, 'optionalAccess', _39 => _39.name]) || toID(target)} doesn't have any submitted giveaways.`);
			}
			const giveaway = exports.wifiData.submittedGiveaways[hasGiveaway.type][hasGiveaway.index];
			if (hasGiveaway.type === 'question') {
				const data = giveaway ;
				this.parse(`/giveaway create question ${data.targetUserID}|${data.ot}|${data.tid}|${data.game}|${data.question}|${data.answers.join(',')}|${data.ivs.join('/')}|${data.ball}|${data.extraInfo}|${Teams.pack([data.prize])}`);
			} else {
				const data = giveaway ;
				this.parse(`/giveaway create lottery ${data.targetUserID}|${data.ot}|${data.tid}|${data.game}|${data.winners}|${data.ivs.join('/')}|${data.ball}|${data.extraInfo}|${Teams.pack([data.prize])}`);
			}
			exports.wifiData.submittedGiveaways[hasGiveaway.type].splice(hasGiveaway.index, 1);
			saveData();
			this.refreshPage(`giveaways-submitted`);
			targetUser.send(`${user.name} has approved your ${hasGiveaway.type} giveaway!`);
			this.privateModAction(`${user.name} approved a ${hasGiveaway.type} giveaway by ${targetUser.name}.`);
			this.modlog(`GIVEAWAY APPROVE ${hasGiveaway.type.toUpperCase()}`, targetUser, null, {noalts: true, noip: true});
		},
		deny: 'delete',
		delete(target, room, user, connection, cmd) {
			room = this.room = Rooms.search('wifi') || null;
			if (!room) {
				throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
			}
			if (!target) return this.parse('/help giveaway');
			const del = cmd === 'delete';
			if (del) {
				const [type, indexStr] = target.split(',');
				const index = parseInt(indexStr) - 1;
				if (!type || !indexStr || index <= -1 || !['question', 'lottery'].includes(toID(type)) || isNaN(index)) {
					return this.parse(`/help giveaway`);
				}
				const typedType = toID(type) ;
				const giveaway = exports.wifiData.storedGiveaways[typedType][index];
				if (!giveaway) {
					throw new Chat.ErrorMessage(
						`There is no giveaway at index ${index}. Indices must be integers between 0 and ${exports.wifiData.storedGiveaways[typedType].length - 1}.`
					);
				}
				exports.wifiData.storedGiveaways[typedType].splice(index, 1);
				saveData();
				this.privateModAction(`${user.name} deleted a ${typedType} giveaway by ${giveaway.targetUserID}.`);
				this.modlog(`GIVEAWAY DELETE ${typedType.toUpperCase()}`);
			} else {
				const {targetUser, rest: reason} = this.splitUser(target);
				if (!_optionalChain([targetUser, 'optionalAccess', _40 => _40.connected])) {
					throw new Chat.ErrorMessage(`${_optionalChain([targetUser, 'optionalAccess', _41 => _41.name]) || toID(target)} is offline, so their giveaway can't be run.`);
				}
				const hasGiveaway = hasSubmittedGiveaway(targetUser);
				if (!hasGiveaway) {
					this.refreshPage('giveaways-submitted');
					throw new Chat.ErrorMessage(`${_optionalChain([targetUser, 'optionalAccess', _42 => _42.name]) || toID(target)} doesn't have any submitted giveaways.`);
				}
				exports.wifiData.submittedGiveaways[hasGiveaway.type].splice(hasGiveaway.index, 1);
				saveData();
				_optionalChain([targetUser, 'optionalAccess', _43 => _43.send, 'call', _44 => _44(`Staff have rejected your giveaway${reason ? `: ${reason}` : '.'}`)]);
				this.privateModAction(`${user.name} denied a ${hasGiveaway.type} giveaway by ${targetUser.name}.`);
				this.modlog(`GIVEAWAY DENY ${hasGiveaway.type.toUpperCase()}`, targetUser, reason || null, {noalts: true, noip: true});
			}
			this.refreshPage(del ? `giveaways-stored` : 'giveaways-submitted');
		},
		unwhitelist: 'whitelist',
		whitelist(target, room, user, connection, cmd) {
			room = this.requireRoom('wifi' );
			this.checkCan('warn', null, room);
			const targetId = toID(target);
			if (!targetId) return this.parse(`/help giveaway whitelist`);
			if (cmd.includes('un')) {
				const idx = exports.wifiData.whitelist.indexOf(targetId);
				if (idx < 0) {
					return this.errorReply(`'${targetId}' is not whitelisted.`);
				}
				exports.wifiData.whitelist.splice(idx, 1);
				this.privateModAction(`${user.name} removed '${targetId}' from the giveaway whitelist.`);
				this.modlog(`GIVEAWAY UNWHITELIST`, targetId);
				saveData();
			} else {
				if (exports.wifiData.whitelist.includes(targetId)) {
					return this.errorReply(`'${targetId}' is already whitelisted.`);
				}
				exports.wifiData.whitelist.push(targetId);
				this.privateModAction(`${user.name} added ${targetId} to the giveaway whitelist.`);
				this.modlog(`GIVEAWAY WHITELIST`, targetId);
				saveData();
			}
		},
		whitelisthelp: [
			`/giveaway whitelist [user] - Allow the given [user] to make giveaways without staff help. Requires: % @ # &`,
			`/giveaway unwhitelist [user] - Remove the given user from the giveaway whitelist. Requires: % @ # &`,
		],
		whitelisted(target, room, user) {
			room = this.requireRoom('wifi' );
			this.checkCan('warn', null, room);
			const buf = [React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1397}}, "Currently whitelisted users"  ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1397}} )];
			if (!exports.wifiData.whitelist.length) {
				buf.push(React.createElement('div', { class: "message-error", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1399}}, "None."));
			} else {
				buf.push(exports.wifiData.whitelist.map(n => React.createElement('username', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1401}}, n)));
			}
			this.sendReplyBox(React.createElement(React.Fragment, null, buf));
		},
		claim(target, room, user) {
			room = this.requireRoom('wifi' );
			this.checkCan('mute', null, room);
			const {targetUser} = this.requireUser(target);
			const hasGiveaway = hasSubmittedGiveaway(targetUser);
			if (!hasGiveaway) {
				this.refreshPage('giveaways-submitted');
				throw new Chat.ErrorMessage(`${_optionalChain([targetUser, 'optionalAccess', _45 => _45.name]) || toID(target)} doesn't have any submitted giveaways.`);
			}
			// we ensure it exists above
			const giveaway = exports.wifiData.submittedGiveaways[hasGiveaway.type][hasGiveaway.index];
			if (giveaway.claimed) throw new Chat.ErrorMessage(`That giveaway is already claimed by ${giveaway.claimed}.`);
			giveaway.claimed = user.id;
			Chat.refreshPageFor('giveaways-submitted', room);
			this.privateModAction(`${user.name} claimed ${targetUser.name}'s giveaway`);
			saveData();
		},
		unclaim(target, room, user) {
			room = this.requireRoom('wifi' );
			this.checkCan('mute', null, room);
			const {targetUser} = this.requireUser(target);
			const hasGiveaway = hasSubmittedGiveaway(targetUser);
			if (!hasGiveaway) {
				this.refreshPage('giveaways-submitted');
				throw new Chat.ErrorMessage(`${_optionalChain([targetUser, 'optionalAccess', _46 => _46.name]) || toID(target)} doesn't have any submitted giveaways.`);
			}
			// we ensure it exists above
			const giveaway = exports.wifiData.submittedGiveaways[hasGiveaway.type][hasGiveaway.index];
			if (!giveaway.claimed) throw new Chat.ErrorMessage(`That giveaway is not claimed.`);
			delete giveaway.claimed;
			Chat.refreshPageFor('giveaways-submitted', room);
			saveData();
		},
		count(target, room, user) {
			room = this.requireRoom('wifi' );
			if (!Dex.species.get(target).exists) {
				throw new Chat.ErrorMessage(`No Pok\u00e9mon entered. Proper syntax: /giveaway count pokemon`);
			}
			target = Dex.species.get(target).id;
			this.runBroadcast();

			const count = exports.wifiData.stats[target];

			if (!count) return this.sendReplyBox("This Pokémon has never been given away.");
			const recent = count.filter(val => val + RECENT_THRESHOLD > Date.now()).length;

			this.sendReplyBox(`This Pokémon has been given away ${Chat.count(count, "times")}, a total of ${Chat.count(recent, "times")} in the past month.`);
		},
	},
	giveawayhelp(target, room, user) {
		room = this.requireRoom('wifi' );
		this.runBroadcast();
		const buf = [];
		if (user.can('show', null, room)) {
			buf.push(React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1459}}, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1459}}, "Staff commands" )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1460}}, "/giveaway create" ), " - Pulls up a page to create a giveaway. Requires: + % @ # &"               , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1460}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1461}}, "/giveaway create question Giver | OT | TID | Game | Question | Answer 1, Answer 2, Answer 3 | IV/IV/IV/IV/IV/IV | Poké Ball | Extra Info | Prize"

), " - Start a new question giveaway (voices can only host their own). Requires: + % @ # &"                  , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1463}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1464}}, "/giveaway create lottery Giver | OT | TID | Game | # of Winners | IV/IV/IV/IV/IV/IV | Poké Ball | Extra Info | Prize"

), " - Start a new lottery giveaway (voices can only host their own). Requires: + % @ # &"                  , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1466}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1467}}, "/giveaway changequestion/changeanswer"

), " - Changes the question/answer of a question giveaway. Requires: Being giveaway host"            , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1469}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1470}}, "/giveaway viewanswer" ), " - Shows the answer of a question giveaway. Requires: Being giveaway host/giver"            , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1470}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1471}}, "/giveaway ban [user], [reason]"

), " - Temporarily bans [user] from entering giveaways. Requires: % @ # &"            , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1473}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1474}}, "/giveaway end" ), " - Forcibly ends the current giveaway. Requires: % @ # &"           , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1474}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1475}}, "/giveaway count [pokemon]"  ), " - Shows how frequently a certain Pokémon has been given away."           , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1475}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1476}}, "/giveaway whitelist [user]"  ), " - Allow the given [user] to make giveaways. Requires: % @ # &"             , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1476}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1477}}, "/giveaway unwhitelist [user]"  ), " - Remove the given user from the giveaway whitelist. Requires: % @ # &"
));
		}
		// Giveaway stuff
		buf.push(React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1481}}, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1481}}, "Giveaway participation commands"  )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1482}}, "/guess [target]" ), " - Guesses an answer for a question giveaway."        , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1482}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1483}}, "/giveaway submit"

), " - Allows users to submit giveaways. They must remain online after submitting for it to go through."                 , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1485}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1486}}, "/giveaway viewanswer" ), " - Guesses an answer for a question giveaway. Requires: Giveaway host/giver"           , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1486}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1487}}, "/giveaway remind" ), " - Shows the details of the current giveaway."        , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1487}} )
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1488}}, "/giveaway join/leave" ), " - Joins/leaves a lottery giveaway."
));
		this.sendReplyBox(React.createElement(React.Fragment, null, buf));
	},
}; exports.commands = commands;

function makePageHeader(user, pageid) {
	const titles = {
		create: `Create`,
		stored: `View Stored`,
		'stored-add': 'Store',
		submitted: `View Submitted`,
		'submitted-add': `Submit`,
	};
	const icons = {
		create: React.createElement('i', { class: "fa fa-sticky-note" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1503}}),
		stored: React.createElement('i', { class: "fa fa-paste" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1504}}),
		'stored-add': React.createElement('i', { class: "fa fa-paste" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1505}}),
		submitted: React.createElement('i', { class: "fa fa-inbox" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1506}}),
		'submitted-add': React.createElement('i', { class: "fa fa-inbox" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1507}}),
	};
	const buf = [];
	buf.push(React.createElement('button', { class: "button", style: {float: 'right'}, name: "send", value: 
		`/j view-giveaways${_optionalChain([pageid, 'optionalAccess', _47 => _47.trim, 'call', _48 => _48()]) ? `-${pageid.trim()}` : ''}`
	, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1510}}
, React.createElement('i', { class: "fa fa-refresh" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1513}}), " Refresh"
));
	buf.push(React.createElement('h1', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1515}}, "Wi-Fi Giveaways" ));
	const urls = [];
	const room = Rooms.get('wifi'); // we validate before using that wifi exists
	for (const i in titles) {
		if (urls.length) urls.push(' / ');
		if (!user.can('mute', null, room) && i !== 'submitted-add') {
			continue;
		}
		const title = titles[i];
		const icon = icons[i];
		if (pageid === i) {
			urls.push(React.createElement(React.Fragment, null, icon, " " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1526}}, title)));
		} else {
			urls.push(React.createElement(React.Fragment, null, icon, " " , React.createElement('a', { href: `/view-giveaways-${i}`, target: "replace", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1528}}, title)));
		}
	}
	buf.push(React.createElement(React.Fragment, null, [urls]), React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1531}} ));
	return React.createElement('center', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1532}}, buf);
}

function formatFakeButton(url, text) {
	return React.createElement('a', { class: "button", style: {textDecoration: 'inherit'}, target: "replace", href: url, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1536}}, text);
}

function generatePokeballDropdown() {
	const pokeballs = Dex.items.all().filter(item => item.isPokeball).sort((a, b) => a.num - b.num);
	const pokeballsObj = [React.createElement('option', { value: "", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1541}}, "Please select a Poké Ball"    )];
	for (const pokeball of pokeballs) {
		pokeballsObj.push(React.createElement('option', { value: pokeball.id, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1543}}, pokeball.name));
	}
	return React.createElement(React.Fragment, null, React.createElement('label', { for: "ball", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1545}}, "Poké Ball type: "   ), React.createElement('select', { name: "ball", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1545}}, pokeballsObj));
}

 const pages = {
	giveaways: {
		''() {
			this.title = `[Giveaways]`;
			if (!Rooms.search('wifi')) return React.createElement('h1', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1552}}, "There is no Wi-Fi room on this server."       );
			this.checkCan('warn', null, Rooms.search('wifi'));
			return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1554}}, makePageHeader(this.user));
		},
		create(args, user) {
			this.title = `[Create Giveaways]`;
			const wifi = Rooms.search('wifi');
			if (!wifi) return React.createElement('h1', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1559}}, "There is no Wi-Fi room on this server."       );
			if (!(user.can('show', null, wifi) || exports.wifiData.whitelist.includes(user.id))) {
				this.checkCan('warn', null, wifi);
			}
			const [type] = args;
			return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1564}}, makePageHeader(this.user, 'create'), (() => {
				if (!type || !['lottery', 'question'].includes(type)) {
					return React.createElement('center', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1566}}
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1567}}, "Pick a Giveaway type"   )
, 
							formatFakeButton(`/view-giveaways-create-lottery`, React.createElement(React.Fragment, null, React.createElement('i', { class: "fa fa-random" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1569}}), " Lottery" ))
						, " | "  , 
							formatFakeButton(`/view-giveaways-create-question`, React.createElement(React.Fragment, null, React.createElement('i', { class: "fa fa-question" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1571}}), " Question" ))
						
);
				}
				switch (type) {
				case 'lottery':
					return React.createElement(React.Fragment, null
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1578}}, "Make a Lottery Giveaway"   )
, React.createElement('form', { 'data-submitsend': "/giveaway create lottery {giver}|{ot}|{tid}|{game}|{winners}|{ivs}|{ball}|{info}|{set}", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1579}}
, React.createElement('label', { for: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1580}}, "Giver: " ), React.createElement('input', { name: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1580}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1580}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1580}} )
, React.createElement('label', { for: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1581}}, "OT: " ), React.createElement('input', { name: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1581}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1581}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1581}} )
, React.createElement('label', { for: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1582}}, "TID: " ), React.createElement('input', { name: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1582}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1582}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1582}} ), "Game: "
 , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1583}}
, React.createElement('input', { type: "radio", id: "bdsp", name: "game", value: "bdsp", checked: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1584}} ), React.createElement('label', { for: "bdsp", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1584}}, "BDSP")
, React.createElement('input', { type: "radio", id: "swsh", name: "game", value: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1585}} ), React.createElement('label', { for: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1585}}, "SwSh")
), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1586}} )
, React.createElement('label', { for: "winners", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1587}}, "Number of winners: "   ), React.createElement('input', { name: "winners", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1587}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1587}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1587}} )
, generatePokeballDropdown(), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1588}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1588}} )
, React.createElement('label', { for: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1589}}, "IVs (Formatted like \"1/30/31/X/HT/30\"): "    ), React.createElement('input', { name: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1589}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1589}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1589}} )
, React.createElement('label', { for: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1590}}, "Prize:"), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1590}} )
, React.createElement('textarea', { style: {width: '70%', height: '300px'}, placeholder: "Paste set importable"  , name: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1591}}), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1591}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1591}} )
, React.createElement('label', { for: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1592}}, "Additional information (if any):"   ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1592}} )
, React.createElement('textarea', { style: {width: '50%', height: '100px'}, placeholder: "Add any additional info"   , name: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1593}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1594}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1594}} )
, React.createElement('button', { class: "button", type: "submit", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1595}}, "Create Lottery Giveaway"  )
)
);
				case 'question':
					return React.createElement(React.Fragment, null
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1600}}, "Make a Question Giveaway"   )
, React.createElement('form', { 'data-submitsend': 
							"/giveaway create question {giver}|{ot}|{tid}|{game}|{question}|{answers}|{ivs}|{ball}|{info}|{set}"
						, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1601}}
, React.createElement('label', { for: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1604}}, "Giver:"), React.createElement('input', { name: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1604}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1604}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1604}} )
, React.createElement('label', { for: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1605}}, "OT:"), React.createElement('input', { name: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1605}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1605}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1605}} )
, React.createElement('label', { for: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1606}}, "TID:"), React.createElement('input', { name: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1606}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1606}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1606}} ), "Game: "
 , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1607}}
, React.createElement('input', { type: "radio", id: "bdsp", name: "game", value: "bdsp", checked: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1608}} ), React.createElement('label', { for: "bdsp", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1608}}, "BDSP")
, React.createElement('input', { type: "radio", id: "swsh", name: "game", value: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1609}} ), React.createElement('label', { for: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1609}}, "SwSh")
), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1610}} )
, React.createElement('label', { for: "question", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1611}}, "Question:"), React.createElement('input', { name: "question", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1611}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1611}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1611}} )
, React.createElement('label', { for: "answers", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1612}}, "Answers (separated by comma):"   ), React.createElement('input', { name: "answers", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1612}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1612}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1612}} )
, generatePokeballDropdown(), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1613}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1613}} )
, React.createElement('label', { for: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1614}}, "IVs (Formatted like \"1/30/31/X/HT/30\"): "    ), React.createElement('input', { name: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1614}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1614}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1614}} )
, React.createElement('label', { for: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1615}})
, React.createElement('textarea', { style: {width: '70%', height: '300px'}, placeholder: "Paste set importable here"   , name: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1616}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1617}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1617}} )
, React.createElement('label', { for: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1618}}, "Additional information (if any):"   ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1618}} )
, React.createElement('textarea', { style: {width: '50%', height: '100px'}, placeholder: "Add any additional info"   , name: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1619}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1620}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1620}} )
, React.createElement('button', { class: "button", type: "submit", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1621}}, "Create Question Giveaway"  )
)
);
				}
			})());
		},
		stored(args, user) {
			this.title = `[Stored Giveaways]`;
			if (!Rooms.search('wifi')) return React.createElement('h1', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1629}}, "There is no Wi-Fi room on this server."       );
			this.checkCan('warn', null, Rooms.search('wifi'));
			const [add, type] = args;
			const giveaways = [
				...((exports.wifiData.storedGiveaways || {}).lottery || []),
				...((exports.wifiData.storedGiveaways || {}).question || []),
			];
			const adding = add === 'add';
			if (!giveaways.length && !adding) {
				return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1638}}
, makePageHeader(this.user, adding ? 'stored-add' : 'stored')
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1640}}, "There are no giveaways stored"    )
);
			}
			return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1643}}
, makePageHeader(this.user, adding ? 'stored-add' : 'stored')
, (() => {
					if (!adding) {
						const buf = [];
						for (let giveaway of giveaways) {
							if (exports.wifiData.storedGiveaways.lottery.includes(giveaway )) {
								giveaway = giveaway ;
								const targetUser = Users.get(giveaway.targetUserID);
								buf.push(React.createElement('div', { class: "infobox", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1652}}
, React.createElement('h3', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1653}}, "Lottery")
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1654}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1655}}, "Game:"), " " , gameName[giveaway.game], React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1655}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1656}}, "Giver:"), " " , giveaway.targetUserID, ", " 
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1657}}, "OT:"), " " , giveaway.ot, ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1657}}, "TID:"), " " , giveaway.tid, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1657}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1658}}, "# of winners:"  ), " " , giveaway.winners, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1658}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1659}}, "Poké Ball:" ), " " , React.createElement('psicon', { item: giveaway.ball, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1659}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1660}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1661}}, React.createElement('psicon', { pokemon: giveaway.prize.species, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1661}} ), " Prize" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1662}}, Giveaway.convertIVs(giveaway.prize, giveaway.ivs))
)
, !!_optionalChain([giveaway, 'access', _49 => _49.extraInfo, 'optionalAccess', _50 => _50.trim, 'call', _51 => _51()]) && React.createElement(React.Fragment, null
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1665}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1666}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1667}}, "Extra Info" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1668}}, giveaway.extraInfo.trim())
)
)
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1671}} )
, React.createElement('button', { class: "button", name: "send", value: 
										`/giveaway delete lottery,${exports.wifiData.storedGiveaways.lottery.indexOf(giveaway) + 1}`
									, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1672}}, React.createElement('i', { class: "fa fa-trash" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1674}}), " Delete giveaway"  )
, !_optionalChain([targetUser, 'optionalAccess', _52 => _52.connected]) ?
										React.createElement('button', { title: "The giver is offline"   , disabled: true, class: "button disabled" , style: {float: 'right'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1676}}, "Create giveaway"

) :
										React.createElement('button', { class: "button", style: {float: 'right'}, name: "send", value: 
											`/giveaway create lottery ${giveaway.targetUserID}|${giveaway.ot}|${giveaway.tid}|${giveaway.game}|${giveaway.winners}|${giveaway.ivs.join('/')}|${giveaway.ball}|${giveaway.extraInfo.trim().replace(/\n/g, '<br />')}|${Teams.pack([giveaway.prize])}`
										, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1679}}, "Create giveaway" )
									
));
							} else {
								giveaway = giveaway ;
								const targetUser = Users.get(giveaway.targetUserID);
								buf.push(React.createElement('div', { class: "infobox", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1687}}
, React.createElement('h3', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1688}}, "Lottery")
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1689}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1690}}, "Game:"), " " , gameName[giveaway.game], React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1690}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1691}}, "Giver:"), " " , giveaway.targetUserID, ", " 
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1692}}, "OT:"), " " , giveaway.ot, ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1692}}, "TID:"), " " , giveaway.tid, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1692}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1693}}, "Question:"), " " , giveaway.question, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1693}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1694}}, "Answer", Chat.plural(giveaway.answers.length, "s"), ":"), " " , giveaway.answers.join(', '), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1694}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1695}}, "Poké Ball:" ), " " , React.createElement('psicon', { item: giveaway.ball, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1695}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1696}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1697}}, React.createElement('psicon', { pokemon: giveaway.prize.species, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1697}} ), " Prize" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1698}}, Giveaway.convertIVs(giveaway.prize, giveaway.ivs))
)
, !!_optionalChain([giveaway, 'access', _53 => _53.extraInfo, 'optionalAccess', _54 => _54.trim, 'call', _55 => _55()]) && React.createElement(React.Fragment, null
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1701}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1702}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1703}}, "Extra Info" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1704}}, giveaway.extraInfo.trim())
)
)
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1707}} )
, React.createElement('button', { class: "button", name: "send", value: 
										`/giveaway delete question,${exports.wifiData.storedGiveaways.question.indexOf(giveaway) + 1}`
									, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1708}}
, React.createElement('i', { class: "fa fa-trash" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1711}}), " Delete giveaway"
)
, !_optionalChain([targetUser, 'optionalAccess', _56 => _56.connected]) ?
										React.createElement('button', { title: "The giver is offline"   , disabled: true, class: "button disabled" , style: {float: 'right'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1714}}, "Create giveaway"

) :
										React.createElement('button', { class: "button", style: {float: 'right'}, name: "send", value: 
											`/giveaway create question ${giveaway.targetUserID}|${giveaway.ot}|${giveaway.tid}|${giveaway.game}|${giveaway.question}|${giveaway.answers.join(',')}|${giveaway.ivs.join('/')}|${giveaway.ball}|${giveaway.extraInfo.trim().replace(/\n/g, '<br />')}|${Teams.pack([giveaway.prize])}`
										, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1717}}, "Create giveaway" )
									
));
							}
						}
						return React.createElement(React.Fragment, null, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1724}}, "Stored Giveaways" ), buf);
					} else {
						return React.createElement(React.Fragment, null, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1726}}, "Store a Giveaway"  )
, (() => {
								if (!type || !['question', 'lottery'].includes(type)) {
									return React.createElement('center', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1729}}
, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1730}}, "Pick a giveaway type"   )
, 
											formatFakeButton(`/view-giveaways-stored-add-lottery`, React.createElement(React.Fragment, null, React.createElement('i', { class: "fa fa-random" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1732}}), " Lottery" ))
										, " | "  , 
											formatFakeButton(`/view-giveaways-stored-add-question`, React.createElement(React.Fragment, null, React.createElement('i', { class: "fa fa-question" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1734}}), " Question" ))
										
);
								}
								switch (type) {
								case 'lottery':
									return React.createElement('form', { 'data-submitsend': "/giveaway store lottery {giver}|{ot}|{tid}|{game}|{winners}|{ivs}|{ball}|{info}|{set}"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1740}}
, React.createElement('label', { for: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1741}}, "Giver: " ), React.createElement('input', { name: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1741}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1741}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1741}} )
, React.createElement('label', { for: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1742}}, "OT: " ), React.createElement('input', { name: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1742}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1742}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1742}} )
, React.createElement('label', { for: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1743}}, "TID: " ), React.createElement('input', { name: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1743}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1743}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1743}} ), "Game: "
 , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1744}}
, React.createElement('input', { type: "radio", id: "bdsp", name: "game", value: "bdsp", checked: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1745}} ), React.createElement('label', { for: "bdsp", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1745}}, "BDSP")
, React.createElement('input', { type: "radio", id: "swsh", name: "game", value: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1746}} ), React.createElement('label', { for: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1746}}, "SwSh")
), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1747}} )
, React.createElement('label', { for: "winners", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1748}}, "Number of winners: "   ), React.createElement('input', { name: "winners", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1748}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1748}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1748}} )
, generatePokeballDropdown(), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1749}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1749}} )
, React.createElement('label', { for: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1750}}, "IVs (Formatted like \"1/30/31/X/HT/30\"): "    ), React.createElement('input', { name: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1750}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1750}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1750}} )
, React.createElement('label', { for: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1751}}, "Prize:"), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1751}} )
, React.createElement('textarea', { style: {width: '70%', height: '300px'}, placeholder: "Paste set importable"  , name: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1752}}), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1752}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1752}} )
, React.createElement('label', { for: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1753}}, "Additional information (if any):"   ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1753}} )
, React.createElement('textarea', { style: {width: '50%', height: '100px'}, placeholder: "Add any additional info"   , name: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1754}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1755}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1755}} )
, React.createElement('button', { class: "button", type: "submit", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1756}}, "Store Lottery Giveaway"  )
);
								case 'question':
									return React.createElement('form', { 'data-submitsend': 
										"/giveaway store question {giver}|{ot}|{tid}|{game}|{question}|{answers}|{ivs}|{ball}|{info}|{set}"
									, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1759}}
, React.createElement('label', { for: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1762}}, "Giver:"), React.createElement('input', { name: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1762}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1762}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1762}} )
, React.createElement('label', { for: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1763}}, "OT:"), React.createElement('input', { name: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1763}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1763}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1763}} )
, React.createElement('label', { for: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1764}}, "TID:"), React.createElement('input', { name: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1764}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1764}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1764}} ), "Game: "
 , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1765}}
, React.createElement('input', { type: "radio", id: "bdsp", name: "game", value: "bdsp", checked: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1766}} ), React.createElement('label', { for: "bdsp", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1766}}, "BDSP")
, React.createElement('input', { type: "radio", id: "swsh", name: "game", value: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1767}} ), React.createElement('label', { for: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1767}}, "SwSh")
), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1768}} )
, React.createElement('label', { for: "question", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1769}}, "Question:"), React.createElement('input', { name: "question", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1769}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1769}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1769}} )
, React.createElement('label', { for: "answers", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1770}}, "Answers (separated by comma):"   ), React.createElement('input', { name: "answers", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1770}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1770}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1770}} )
, generatePokeballDropdown(), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1771}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1771}} )
, React.createElement('label', { for: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1772}}, "IVs (Formatted like \"1/30/31/X/HT/30\"): "    ), React.createElement('input', { name: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1772}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1772}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1772}} )
, React.createElement('label', { for: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1773}})
, React.createElement('textarea', { style: {width: '70%', height: '300px'}, placeholder: "Paste set importable here"   , name: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1774}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1775}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1775}} )
, React.createElement('label', { for: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1776}}, "Additional information (if any):"   ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1776}} )
, React.createElement('textarea', { style: {width: '50%', height: '100px'}, placeholder: "Add any additional info"   , name: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1777}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1778}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1778}} )
, React.createElement('button', { class: "button", type: "submit", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1779}}, "Store Question Giveaway"  )
);
								}
							})()
);
					}
				})()
);
		},
		submitted(args, user) {
			this.title = `[Submitted Giveaways]`;
			if (!Rooms.search('wifi')) return React.createElement('h1', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1790}}, "There is no Wi-Fi room on this server."       );
			const [add, type] = args;
			const adding = add === 'add';
			if (!adding) this.checkCan('warn', null, Rooms.get('wifi'));
			const giveaways = [
				...((exports.wifiData.submittedGiveaways || {}).lottery || []),
				...((exports.wifiData.submittedGiveaways || {}).question || []),
			];
			if (!giveaways.length && !adding) {
				return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1799}}
, makePageHeader(this.user, args[0] === 'add' ? 'submitted-add' : 'submitted')
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1801}}, "There are no submitted giveaways."    )
);
			}
			return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1804}}
, makePageHeader(this.user, args[0] === 'add' ? 'submitted-add' : 'submitted')
, (() => {
					if (!adding) {
						const buf = [];
						for (let giveaway of giveaways) {
							const claimCmd = giveaway.claimed === user.id ?
								`/giveaway unclaim ${giveaway.targetUserID}` :
								`/giveaway claim ${giveaway.targetUserID}`;
							const claimedTitle = giveaway.claimed === user.id ?
								"Unclaim" : giveaway.claimed ?
									`Claimed by ${giveaway.claimed}` : `Claim`;
							const disabled = giveaway.claimed && giveaway.claimed !== user.id ? " disabled" : "";
							buf.push(React.createElement('div', { class: "infobox", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1817}}
, (() => {
									if (exports.wifiData.submittedGiveaways.lottery.includes(giveaway )) {
										giveaway = giveaway ;
										return React.createElement(React.Fragment, null
, React.createElement('h3', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1822}}, "Lottery")
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1823}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1824}}, "Game:"), " " , gameName[giveaway.game], ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1824}}, "Giver:"), " " , giveaway.targetUserID, ", " 
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1825}}, "OT:"), " " , giveaway.ot, ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1825}}, "TID:"), " " , giveaway.tid, ", " 
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1826}}, "# of winners:"  ), " " , giveaway.winners
, !!giveaway.claimed && React.createElement(React.Fragment, null, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1827}} ), React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1827}}, "Claimed:"), " " , giveaway.claimed), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1827}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1828}}, "Poké Ball:" ), " " , React.createElement('psicon', { item: giveaway.ball, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1828}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1829}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1830}}, React.createElement('psicon', { pokemon: giveaway.prize.species, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1830}} ), " Prize" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1831}}, Giveaway.convertIVs(giveaway.prize, giveaway.ivs))
)
, !!_optionalChain([giveaway, 'access', _57 => _57.extraInfo, 'optionalAccess', _58 => _58.trim, 'call', _59 => _59()]) && React.createElement(React.Fragment, null
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1834}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1835}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1836}}, "Extra Info" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1837}}, giveaway.extraInfo.trim())
)
)
);
									} else {
										giveaway = giveaway ;
										return React.createElement(React.Fragment, null
, React.createElement('h3', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1844}}, "Question")
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1845}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1846}}, "Game:"), " " , gameName[giveaway.game], ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1846}}, "Giver:"), " " , giveaway.targetUserID, ", " 
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1847}}, "OT:"), " " , giveaway.ot, ", " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1847}}, "TID:"), " " , giveaway.tid
, !!giveaway.claimed && React.createElement(React.Fragment, null, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1848}} ), React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1848}}, "Claimed:"), " " , giveaway.claimed), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1848}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1849}}, "Question:"), " " , giveaway.question, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1849}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1850}}, "Answer", Chat.plural(giveaway.answers.length, "s"), ":"), " " , giveaway.answers.join(', '), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1850}} )
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1851}}, "Poké Ball:" ), " " , React.createElement('psicon', { item: giveaway.ball, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1851}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1852}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1853}}, React.createElement('psicon', { pokemon: giveaway.prize.species, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1853}} ), " Prize" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1854}}, Giveaway.convertIVs(giveaway.prize, giveaway.ivs))
)
, !!_optionalChain([giveaway, 'access', _60 => _60.extraInfo, 'optionalAccess', _61 => _61.trim, 'call', _62 => _62()]) && React.createElement(React.Fragment, null
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1857}} )
, React.createElement('details', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1858}}
, React.createElement('summary', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1859}}, "Extra Info" )
, React.createElement(Chat.JSX.FormatText, { isTrusted: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1860}}, giveaway.extraInfo.trim())
)
)
);
									}
								})()
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1866}} )
, !_optionalChain([Users, 'access', _63 => _63.get, 'call', _64 => _64(giveaway.targetUserID), 'optionalAccess', _65 => _65.connected]) ? React.createElement(React.Fragment, null
, React.createElement('button', { title: "The giver is offline"   , class: "button disabled" , disabled: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1868}}
, React.createElement('i', { class: "fa fa-times-circle" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1869}}), " Deny giveaway"
)
, React.createElement('button', { style: {textAlign: 'center'}, class: `button${disabled}`, name: "send", value: `/msgroom wifi,${claimCmd}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1871}}
, claimedTitle
)
, React.createElement('button', { title: "The giver is offline"   , disabled: true, class: "button disabled" , style: {float: 'right'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1874}}, "Create giveaway"

)
) : React.createElement(React.Fragment, null
, React.createElement('button', { class: "button", name: "send", value: `/giveaway deny ${giveaway.targetUserID}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1878}}
, React.createElement('i', { class: "fa fa-times-circle" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1879}}), " Deny giveaway"
)
, React.createElement('button', { style: {textAlign: 'center'}, class: `button${disabled}`, name: "send", value: `/msgroom wifi,${claimCmd}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1881}}
, claimedTitle
)
, React.createElement('button', { class: "button", style: {float: 'right'}, name: "send", value: `/giveaway approve ${giveaway.targetUserID}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1884}}, "Create giveaway"

)
)
));
						}
						return React.createElement(React.Fragment, null, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1890}}, "Submitted Giveaways" ), buf);
					} else {
						return React.createElement(React.Fragment, null
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1893}}, "Submit a Giveaway"  )
, (() => {
								if (!type || !['question', 'lottery'].includes(type)) {
									return React.createElement('center', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1896}}
, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1897}}, "Pick a giveaway type"   )
, 
											formatFakeButton(`/view-giveaways-submitted-add-lottery`, React.createElement(React.Fragment, null, React.createElement('i', { class: "fa fa-random" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1899}}), " Lottery" ))
										, " | "  , 
											formatFakeButton(`/view-giveaways-submitted-add-question`, React.createElement(React.Fragment, null, React.createElement('i', { class: "fa fa-question" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1901}}), " Question" ))
										
);
								}
								switch (type) {
								case 'lottery':
									return React.createElement('form', { 'data-submitsend': "/giveaway submit lottery {giver}|{ot}|{tid}|{game}|{winners}|{ivs}|{ball}|{info}|{set}"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 1907}}
, React.createElement('label', { for: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1908}}, "Giver: " ), React.createElement('input', { name: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1908}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1908}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1908}} )
, React.createElement('label', { for: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1909}}, "OT: " ), React.createElement('input', { name: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1909}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1909}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1909}} )
, React.createElement('label', { for: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1910}}, "TID: " ), React.createElement('input', { name: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1910}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1910}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1910}} ), "Game: "
 , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1911}}
, React.createElement('input', { type: "radio", id: "bdsp", name: "game", value: "bdsp", checked: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1912}} ), React.createElement('label', { for: "bdsp", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1912}}, "BDSP")
, React.createElement('input', { type: "radio", id: "swsh", name: "game", value: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1913}} ), React.createElement('label', { for: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1913}}, "SwSh")
), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1914}} )
, React.createElement('label', { for: "winners", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1915}}, "Number of winners: "   ), React.createElement('input', { name: "winners", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1915}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1915}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1915}} )
, generatePokeballDropdown(), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1916}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1916}} )
, React.createElement('label', { for: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1917}}, "IVs (Formatted like \"1/30/31/X/HT/30\"): "    ), React.createElement('input', { name: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1917}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1917}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1917}} )
, React.createElement('label', { for: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1918}}, "Prize:"), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1918}} )
, React.createElement('textarea', { style: {width: '70%', height: '300px'}, placeholder: "Paste set importable"  , name: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1919}}), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1919}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1919}} )
, React.createElement('label', { for: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1920}}, "Additional information (provide a link of proof here):"       ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1920}} )
, React.createElement('textarea', { style: {width: '50%', height: '100px'}, placeholder: "Add any additional info"   , name: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1921}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1922}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1922}} )
, React.createElement('button', { class: "button", type: "submit", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1923}}, "Submit Lottery Giveaway"  )
);
								case 'question':
									return React.createElement('form', { 'data-submitsend': 
										"/giveaway submit question {giver}|{ot}|{tid}|{game}|{question}|{answers}|{ivs}|{ball}|{info}|{set}"
									, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1926}}
, React.createElement('label', { for: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1929}}, "Giver:"), React.createElement('input', { name: "giver", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1929}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1929}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1929}} )
, React.createElement('label', { for: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1930}}, "OT:"), React.createElement('input', { name: "ot", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1930}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1930}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1930}} )
, React.createElement('label', { for: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1931}}, "TID:"), React.createElement('input', { name: "tid", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1931}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1931}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1931}} ), "Game: "
 , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1932}}
, React.createElement('input', { type: "radio", id: "bdsp", name: "game", value: "bdsp", checked: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 1933}} ), React.createElement('label', { for: "bdsp", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1933}}, "BDSP")
, React.createElement('input', { type: "radio", id: "swsh", name: "game", value: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1934}} ), React.createElement('label', { for: "swsh", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1934}}, "SwSh")
), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1935}} )
, React.createElement('label', { for: "question", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1936}}, "Question:"), React.createElement('input', { name: "question", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1936}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1936}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1936}} )
, React.createElement('label', { for: "answers", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1937}}, "Answers (separated by comma):"   ), React.createElement('input', { name: "answers", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1937}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1937}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1937}} )
, generatePokeballDropdown(), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1938}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1938}} )
, React.createElement('label', { for: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1939}}, "IVs (Formatted like \"1/30/31/X/HT/30\"): "    ), React.createElement('input', { name: "ivs", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1939}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1939}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1939}} )
, React.createElement('label', { for: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1940}})
, React.createElement('textarea', { style: {width: '70%', height: '300px'}, placeholder: "Paste set importable"  , name: "set", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1941}}), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1941}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1941}} )
, React.createElement('label', { for: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1942}}, "Additional information (provide a link of proof here):"       ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1942}} )
, React.createElement('textarea', { style: {width: '50%', height: '100px'}, placeholder: "Add any additional info"   , name: "info", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1943}})
, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1944}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 1944}} )
, React.createElement('button', { class: "button", type: "submit", __self: this, __source: {fileName: _jsxFileName, lineNumber: 1945}}, "Submit Question Giveaway"  )
);
								}
							})()
);
					}
				})()
);
		},
	},
}; exports.pages = pages;

Chat.multiLinePattern.register(`/giveaway (create|new|start|store|submit|save) (question|lottery) `);

 //# sourceMappingURL=sourceMaps/wifi.js.map