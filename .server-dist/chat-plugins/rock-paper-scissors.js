"use strict";const _jsxFileName = "..\\..\\server\\chat-plugins\\rock-paper-scissors.tsx";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Rock Paper Scissors plugin by Mia
 * @author mia-pi-git
 */
const MAX_ROUNDS = 200;
const TIMEOUT = 10 * 1000;
const ICONS = {
	Rock: React.createElement('i', { class: "fa fa-hand-rock-o" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 8}}),
	Paper: React.createElement('i', { class: "fa fa-hand-paper-o" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 9}}),
	Scissors: React.createElement('i', { class: "fa fa-hand-scissors-o" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 10}}),
};

const MATCHUPS = new Map([
	['Scissors', 'Paper'],
	['Rock', 'Scissors'],
	['Paper', 'Rock'],
]);

function toChoice(str) {
	const id = toID(str);
	return id.charAt(0).toUpperCase() + id.slice(1);
}

 class RPSPlayer extends Rooms.RoomGamePlayer {constructor(...args) { super(...args); RPSPlayer.prototype.__init.call(this);RPSPlayer.prototype.__init2.call(this);RPSPlayer.prototype.__init3.call(this);RPSPlayer.prototype.__init4.call(this); }
	__init() {this.choice = ''}
	__init2() {this.prevChoice = ''}
	__init3() {this.prevWinner = false}
	__init4() {this.score = 0}
	sendControls(jsx) {
		this.sendRoom(Chat.html`|controlshtml|${jsx}`);
	}
} exports.RPSPlayer = RPSPlayer;

 class RPSGame extends Rooms.RoomGame {
	
	 __init5() {this.checkChat = true}
	__init6() {this.roundTimer = null}
	constructor(room) {
		super(room);RPSGame.prototype.__init5.call(this);RPSGame.prototype.__init6.call(this);;
		this.currentRound = 0;
		this.title = 'Rock Paper Scissors';
		this.gameid = 'rockpaperscissors' ;

		this.room.update();
		this.controls(React.createElement('div', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 45}}, "Waiting for another player to join...."     ));
		this.sendField();
	}
	controls(node) {
		this.room.send(Chat.html`|controlshtml|${node}`);
	}
	onConnect(user, connection) {
		this.room.sendUser(connection, Chat.html`|fieldhtml|${this.getField()}`);
	}
	static getWinner(p1, p2) {
		const p1Choice = p1.choice;
		const p2Choice = p2.choice;
		if (!p1Choice && p2Choice) return p2;
		if (!p2Choice && p1Choice) return p1;
		if (MATCHUPS.get(p1Choice) === p2Choice) return p1;
		if (MATCHUPS.get(p2Choice) === p1Choice) return p2;
		return null;
	}
	sendControls(player) {
		if (!this.roundTimer) {
			return player.sendControls(React.createElement('div', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 65}}, "The game is paused."
   , React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 66}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 66}} )
, React.createElement('button', { class: "button", name: "send", value: "/rps resume" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 67}}, "Resume game" )
));
		}
		if (player.choice) {
			player.sendControls(
				React.createElement('div', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 72}}, "You have selected "   , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 72}}, player.choice), ". Now to wait for your foe."      )
			);
			return;
		}
		player.sendControls(React.createElement('div', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 76}}
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 77}}, "Make your choice, quick! You have "      , Chat.toDurationString(TIMEOUT), "!"), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 77}} )
, ['Rock', 'Paper', 'Scissors'].map(choice => (
				React.createElement('button', { class: "button", name: "send", value: `/choose ${choice}`, style: {width: '6em'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 79}}
, React.createElement('span', { style: {fontSize: '24px'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 80}}, ICONS[choice]), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 80}} )
, choice || '\u00A0'
)
			)), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 83}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 83}} )
, React.createElement('button', { class: "button", name: "send", value: "/rps end" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 84}}, "End game" )
));
	}
	getField() {
		if (this.players.length < 2) {
			return React.createElement('div', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 89}}, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 89}}, "Waiting to start the game..."    ));
		}

		const [p1, p2] = this.players;

		function renderBigChoice(choice, isWinner) {
			return React.createElement('div', { style: {
				width: '180px', fontSize: '120px', background: isWinner ? '#595' : '#888', color: 'white', borderRadius: '20px', paddingBottom: '5px', margin: '0 auto',
			}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 95}}
, ICONS[choice] || '\u00A0', React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 98}} )
, React.createElement('small', { style: {fontSize: '40px'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 99}}
, React.createElement('small', { style: {fontSize: '32px', display: 'block'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 100}}
, choice || '\u00A0'
)
)
);
		}

		function renderCurrentChoice(exists) {
			return React.createElement('div', { style: {
				width: '100px', fontSize: '60px', background: '#888', color: 'white', borderRadius: '15px', paddingBottom: '5px', margin: '20px auto 0',
			}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 108}}, exists ? React.createElement('i', { class: "fa fa-check" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 110}}) : '\u00A0');
		}

		return React.createElement('table', { style: {width: '100%', textAlign: 'center', fontSize: '18px'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 113}}, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 113}}
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 114}}
, React.createElement('div', { style: {padding: '8px 0'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 115}}, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 115}}, p1.name), " (" , p1.score, ")")
, renderBigChoice(p1.prevChoice, p1.prevWinner)
, renderCurrentChoice(!!p1.choice)
)
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 119}}
, React.createElement('em', { style: {fontSize: '24px'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 120}}, "vs")
)
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 122}}
, React.createElement('div', { style: {padding: '8px 0'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 123}}, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 123}}, p2.name), " (" , p2.score, ")")
, renderBigChoice(p2.prevChoice, p2.prevWinner)
, renderCurrentChoice(!!p2.choice)
)
));
	}
	sendField() {
		this.room.send(Chat.html`|fieldhtml|${this.getField()}`);
	}
	end() {
		const [p1, p2] = this.players;
		if (p1.score === p2.score) {
			this.message(`**Tie** at score ${p1.score}!`);
		} else {
			const [winner, loser] = p1.score > p2.score ? [p1, p2] : [p2, p1];
			this.message(`**${winner.name}** wins with score ${winner.score} to ${loser.score}!`);
		}

		if (this.roundTimer) {
			clearTimeout(this.roundTimer);
			this.roundTimer = null;
		}

		this.room.pokeExpireTimer();
		this.ended = true;
		this.room.add(`|-message|The game has ended.`); // for the benefit of those in the room
		for (const player of this.players) {
			player.sendControls(React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 150}}, "The game has ended."   ));
			player.unlinkUser();
		}
	}
	runMatch() {
		const [p1, p2] = this.players;
		const winner = RPSGame.getWinner(p1, p2);
		if (!winner) { // tie
			if (!p1.choice) {
				this.message(`${p1.name} and ${p2.name} both **timed out**.`);
			} else {
				this.message(`${p1.name} and ${p2.name} **tie** with ${p1.choice}.`);
			}
		} else {
			const loser = p1 === winner ? p2 : p1;
			if (!loser.choice) {
				this.message(`**${winner.name}**'s ${winner.choice} wins; ${loser.name} timed out.`);
			} else {
				this.message(`**${winner.name}**'s ${winner.choice} beats ${loser.name}'s ${loser.choice}.`);
			}
			winner.score++;
		}

		if (!winner && !p1.choice) {
			this.pause();
			return;
		}

		if (this.currentRound >= MAX_ROUNDS) {
			this.message(`The game is ending automatically at ${this.currentRound} rounds.`);
			return this.end();
		}

		for (const player of this.players) {
			player.prevChoice = player.choice;
			player.prevWinner = false;
			player.choice = '';
		}
		if (winner) winner.prevWinner = true;

		this.sendField();
		this.nextRound();
	}
	smallMessage(message) {
		this.room.add(`|-message|${message}`).update();
	}
	message(message) {
		this.room.add(`|message|${message}`).update();
	}
	start() {
		if (this.players.length < 2) {
			throw new Chat.ErrorMessage(`There are not enough players to start. Use /rps start to start when all players are ready.`);
		}
		if (this.room.log.log.length > 1000) {
			// prevent logs from ballooning too much
			this.room.log.log = [];
		}
		const [p1, p2] = this.players;
		this.room.add(
			`|raw|<h2><span style="font-weight: normal">Rock Paper Scissors:</span> ${p1.name} vs ${p2.name}!</h2>\n` +
			`|message|Game started!\n` +
			`|notify|Game started!`
		).update();
		this.nextRound();
	}
	getPlayer(user) {
		const player = this.playerTable[user.id];
		if (!player) throw new Chat.ErrorMessage(`You are not a player in this game.`);
		return player;
	}
	pause(user) {
		if (!this.roundTimer) throw new Chat.ErrorMessage(`The game is not running, and cannot be paused.`);

		const player = user ? this.getPlayer(user) : null;
		clearTimeout(this.roundTimer);
		this.roundTimer = null;
		for (const curPlayer of this.players) this.sendControls(curPlayer);
		if (player) this.message(`The game was paused by ${player.name}.`);
	}
	unpause(user) {
		if (this.roundTimer) throw new Chat.ErrorMessage(`The game is not paused.`);

		const player = this.getPlayer(user);
		this.message(`The game was resumed by ${player.name}.`);
		this.nextRound();
	}
	nextRound() {
		this.currentRound++;
		this.sendField();
		this.room.add(`|html|<h2>Round ${this.currentRound}</h2>`).update();
		this.roundTimer = setTimeout(() => {
			this.runMatch();
		}, TIMEOUT);
		for (const player of this.players) this.sendControls(player);
	}
	choose(user, option) {
		option = toChoice(option);
		const player = this.getPlayer(user);
		if (!MATCHUPS.get(option)) {
			throw new Chat.ErrorMessage(`Invalid choice: ${option}.`);
		}
		if (player.choice) throw new Chat.ErrorMessage("You have already made your choice!");
		player.choice = option;
		this.smallMessage(`${user.name} made a choice.`);
		this.sendControls(player);
		if (this.players.filter(item => item.choice).length > 1) {
			clearTimeout(this.roundTimer);
			this.roundTimer = null;
			return this.runMatch();
		}
		this.sendField();
		return true;
	}
	leaveGame(user) {
		const player = this.getPlayer(user);
		player.sendRoom(`You left the game.`);
		delete this.playerTable[user.id];
		this.end();
	}
	addPlayer(user) {
		if (this.playerTable[user.id]) throw new Chat.ErrorMessage(`You are already a player in this game.`);
		this.playerTable[user.id] = this.makePlayer(user);
		this.players.push(this.playerTable[user.id]);
		this.room.auth.set(user.id, Users.PLAYER_SYMBOL);
		return this.playerTable[user.id];
	}
	makePlayer(user) {
		return new RPSPlayer(user, this);
	}
} exports.RPSGame = RPSGame;

function findExisting(user1, user2) {
	return Rooms.get(`game-rps-${user1}-${user2}`) || Rooms.get(`game-rps-${user2}-${user1}`);
}

 const commands = {
	rps: 'rockpaperscissors',
	rockpaperscissors: {
		challenge: 'create',
		chall: 'create',
		chal: 'create',
		create(target, room, user) {
			target = target.trim();
			if (!target && this.pmTarget) {
				target = this.pmTarget.id;
			}
			const {targetUser, targetUsername} = this.splitUser(target);
			if (!targetUser) {
				return this.errorReply(`User ${targetUsername} not found. Either specify a username or use this command in PMs.`);
			}
			if (targetUser === user) return this.errorReply(`You cannot challenge yourself.`);
			if (targetUser.settings.blockChallenges && !user.can('bypassblocks', targetUser)) {
				Chat.maybeNotifyBlocked('challenge', targetUser, user);
				return this.errorReply(this.tr`The user '${targetUser.name}' is not accepting challenges right now.`);
			}
			const existingRoom = findExisting(user.id, targetUser.id);
			if (_optionalChain([existingRoom, 'optionalAccess', _ => _.game]) && !existingRoom.game.ended) {
				return this.errorReply(`You're already playing a Rock Paper Scissors game against ${targetUser.name}!`);
			}

			Ladders.challenges.add(
				new Ladders.GameChallenge(user.id, targetUser.id, "Rock Paper Scissors", {
					acceptCommand: `/rps accept ${user.id}`,
				})
			);

			if (!this.pmTarget) this.pmTarget = targetUser;
			this.sendChatMessage(
				`/raw ${user.name} wants to play Rock Paper Scissors!`
			);
		},

		accept(target, room, user) {
			const fromUser = Ladders.challenges.accept(this);

			const existingRoom = findExisting(user.id, fromUser.id);
			const roomid = `game-rps-${fromUser.id}-${user.id}`;
			const gameRoom = existingRoom || Rooms.createGameRoom(
				roomid , `[RPS] ${user.name} vs ${fromUser.name}`, {}
			);

			const game = new RPSGame(gameRoom);
			gameRoom.game = game;

			game.addPlayer(fromUser);
			game.addPlayer(user);
			user.joinRoom(gameRoom.roomid);
			fromUser.joinRoom(gameRoom.roomid);
			(gameRoom.game ).start();

			this.pmTarget = fromUser;
			this.sendChatMessage(`/text ${user.name} accepted <<${gameRoom.roomid}>>`);
		},

		deny: 'reject',
		reject(target, room, user) {
			return this.parse(`/reject ${target}`);
		},

		end(target, room, user) {
			const game = this.requireGame(RPSGame);
			if (!game.playerTable[user.id]) {
				return this.errorReply(`You are not a player, and so cannot end the game.`);
			}
			game.end();
		},

		choose(target, room, user) {
			this.parse(`/choose ${target}`);
		},

		leave(target, room, user) {
			this.parse(`/leavegame`);
		},

		pause(target, room, user) {
			const game = this.requireGame(RPSGame);
			game.pause(user);
		},

		unpause: 'resume',
		resume(target, room, user) {
			const game = this.requireGame(RPSGame);
			game.unpause(user);
		},

		'': 'help',
		help() {
			this.runBroadcast();
			const strings = [
				`/rockpaperscissors OR /rps<br />`,
				`/rps challenge [user] - Challenges a user to a game of Rock Paper Scissors`,
				`(in PM) /rps challenge - Challenges a user to a game of Rock Paper Scissors`,
				`/rps leave - Leave the game.`,
				`/rps start - Start the Rock Paper Scissors game.`,
				`/rps end - End the Rock Paper Scissors game`,
				`/rps pause - Pauses the game, if it's in progress.`,
				`/rps resume - Resumes the game, if it's paused.`,
			];
			return this.sendReplyBox(strings.join('<br />'));
		},
	},
}; exports.commands = commands;

 //# sourceMappingURL=sourceMaps/rock-paper-scissors.js.map