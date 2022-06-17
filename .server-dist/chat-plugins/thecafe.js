"use strict";const _jsxFileName = "..\\..\\server\\chat-plugins\\thecafe.tsx";Object.defineProperty(exports, "__esModule", {value: true});var _fs = require('../../.lib-dist/fs');
var _utils = require('../../.lib-dist/utils');

const DISHES_FILE = 'config/chat-plugins/thecafe-foodfight.json';
const FOODFIGHT_COOLDOWN = 5 * 60 * 1000;

const dishes = JSON.parse(_fs.FS.call(void 0, DISHES_FILE).readIfExistsSync() || "{}");

function saveDishes() {
	void _fs.FS.call(void 0, DISHES_FILE).write(JSON.stringify(dishes));
}

function generateTeam(generator = '') {
	let potentialPokemon = Object.keys(Dex.data.Pokedex).filter(mon => {
		const species = Dex.species.get(mon);
		return species.baseSpecies === species.name;
	});
	let speciesClause = true;
	switch (generator) {
	case 'ou':
		potentialPokemon = potentialPokemon.filter(mon => {
			const species = Dex.species.get(mon);
			return species.tier === 'OU';
		}).concat(potentialPokemon.filter(mon => {
			// There is probably a better way to get the ratios right, oh well.
			const species = Dex.species.get(mon);
			return species.tier === 'OU' || species.tier === 'UU';
		}));
		break;
	case 'ag':
		potentialPokemon = potentialPokemon.filter(mon => {
			const species = Dex.species.get(mon);
			const unviable = species.tier === 'NFE' || species.tier === 'PU' ||
				species.tier === '(PU)' || species.tier.startsWith("LC");
			const illegal = species.tier === 'Unreleased' || species.tier === 'Illegal' || species.tier.startsWith("CAP");
			return !(unviable || illegal);
		});
		speciesClause = false;
		break;
	default:
		potentialPokemon = potentialPokemon.filter(mon => {
			const species = Dex.species.get(mon);
			const op = species.tier === 'AG' || species.tier === 'Uber' || species.tier.slice(1, -1) === 'Uber';
			const unviable = species.tier === 'Illegal' || species.tier.includes("LC");
			return !(op || unviable);
		});
		potentialPokemon.push('miltank', 'miltank', 'miltank', 'miltank'); // 5x chance for miltank for flavor purposes.
	}

	const team = [];

	while (team.length < 6) {
		const randIndex = Math.floor(Math.random() * potentialPokemon.length);
		const potentialMon = potentialPokemon[randIndex];
		if (team.includes(potentialMon)) continue;
		team.push(potentialMon);
		if (speciesClause) potentialPokemon.splice(randIndex, 1);
	}

	return team.map(mon => Dex.species.get(mon).name);
}

function generateDish() {
	const keys = Object.keys(dishes);
	const entry = dishes[keys[Math.floor(Math.random() * keys.length)]].slice();
	const dish = entry.splice(0, 1)[0];
	const ingredients = [];
	while (ingredients.length < 6) {
		ingredients.push(entry.splice(Math.floor(Math.random() * entry.length), 1)[0]);
	}
	return [dish, ingredients];
}

 const commands = {
	foodfight(target, room, user) {
		room = this.requireRoom('thecafe' );
		if (!Object.keys(dishes).length) return this.errorReply("No dishes found. Add some dishes first.");

		if (user.foodfight && user.foodfight.timestamp + FOODFIGHT_COOLDOWN > Date.now()) {
			return this.errorReply("Please wait a few minutes before using this command again.");
		}

		target = toID(target);

		let team = [];
		let importable;
		const [newDish, newIngredients] = generateDish();
		if (!target) {
			const bfTeam = Teams.generate('gen7bssfactory');
			for (const [i, name] of newIngredients.entries()) bfTeam[i].name = name;
			importable = Teams.export(bfTeam);
			team = bfTeam.map(val => val.species);
		} else {
			team = generateTeam(target);
		}
		user.foodfight = {generatedTeam: team, dish: newDish, ingredients: newIngredients, timestamp: Date.now()};
		const importStr = importable ?
			_utils.Utils.html`<tr><td colspan=7><details><summary style="font-size:13pt;">Importable team:</summary><div style="width:100%;height:400px;overflow:auto;color:black;font-family:monospace;background:white;text-align:left;">${importable}</textarea></details></td></tr>` :
			'';
		return this.sendReplyBox(`<div class="ladder"><table style="text-align:center;"><tr><th colspan="7" style="font-size:10pt;">Your dish is: <u>${newDish}</u></th></tr><tr><th>Team</th>${team.map(mon => `<td><psicon pokemon="${mon}"/> ${mon}</td>`).join('')}</tr><tr><th>Ingredients</th>${newIngredients.map(ingredient => `<td>${ingredient}</td>`).join('')}</tr>${importStr}</table></div>`);
	},
	checkfoodfight(target, room, user) {
		room = this.requireRoom('thecafe' );

		const targetUser = this.getUserOrSelf(target);
		if (!targetUser) return this.errorReply(`User ${target} not found.`);
		const self = targetUser === user;
		if (!self) this.checkCan('mute', targetUser, room);
		const foodfight = targetUser.foodfight;
		if (!foodfight) {
			return this.errorReply(`${self ? `You don't` : `This user doesn't`} have an active Foodfight team.`);
		}
		return this.sendReplyBox(React.createElement('div', { class: "ladder", __self: this, __source: {fileName: _jsxFileName, lineNumber: 113}}
, React.createElement('table', { style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 114}}
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 115}}, React.createElement('th', { colSpan: 7, style: {fontSize: '10pt'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 115}}
, self ? `Your` : `${targetUser.name}'s`, " dish is: "   , React.createElement('u', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 116}}, foodfight.dish)
))
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 118}}
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 119}}, "Team"), foodfight.generatedTeam.map(mon => React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 119}}, React.createElement('psicon', { pokemon: mon, __self: this, __source: {fileName: _jsxFileName, lineNumber: 119}} ), " " , mon))
)
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 121}}
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 122}}, "Ingredients"), foodfight.ingredients.map(ingredient => React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 122}}, ingredient))
)
)
));
	},
	addingredients: 'adddish',
	adddish(target, room, user, connection, cmd) {
		room = this.requireRoom('thecafe' );
		this.checkCan('mute', null, room);

		let [dish, ...ingredients] = target.split(',');
		dish = dish.trim();
		if (!dish || !ingredients.length) return this.parse('/help foodfight');
		const id = toID(dish);
		if (id === 'constructor') return this.errorReply("Invalid dish name.");
		ingredients = ingredients.map(ingredient => ingredient.trim());

		if ([...ingredients.entries()].some(([index, ingredient]) => ingredients.indexOf(ingredient) !== index)) {
			return this.errorReply("Please don't enter duplicate ingredients.");
		}

		if (ingredients.some(ingredient => ingredient.length > 19)) {
			return this.errorReply("Ingredients can only be 19 characters long.");
		}

		if (cmd === 'adddish') {
			if (dishes[id]) return this.errorReply("This dish already exists.");
			if (ingredients.length < 6) return this.errorReply("Dishes need at least 6 ingredients.");
			dishes[id] = [dish];
		} else {
			if (!dishes[id]) return this.errorReply(`Dish not found: ${dish}`);
			if (ingredients.some(ingredient => dishes[id].includes(ingredient))) {
				return this.errorReply("Please don't enter duplicate ingredients.");
			}
		}

		dishes[id] = dishes[id].concat(ingredients);
		saveDishes();
		this.sendReply(`${cmd.slice(3)} '${dish}: ${ingredients.join(', ')}' added successfully.`);
	},
	removedish(target, room, user) {
		room = this.requireRoom('thecafe' );
		this.checkCan('mute', null, room);

		const id = toID(target);
		if (id === 'constructor') return this.errorReply("Invalid dish.");
		if (!dishes[id]) return this.errorReply(`Dish '${target}' not found.`);

		delete dishes[id];
		saveDishes();
		this.sendReply(`Dish '${target}' deleted successfully.`);
	},
	viewdishes(target, room, user, connection) {
		room = this.requireRoom('thecafe' );

		return this.parse(`/join view-foodfight`);
	},
	foodfighthelp: [
		`/foodfight <generator> - Gives you a randomly generated Foodfight dish, ingredient list and team. Generator can be either 'random', 'ou', 'ag', or left blank. If left blank, uses Battle Factory to generate an importable team.`,
		`/checkfoodfight <username> - Gives you the last team and dish generated for the entered user, or your own if left blank. Anyone can check their own info, checking other people requires: % @ # &`,
		`/adddish <dish>, <ingredient>, <ingredient>, ... - Adds a dish to the database. Requires: % @ # &`,
		`/addingredients <dish>, <ingredient>, <ingredient>, ... - Adds extra ingredients to a dish in the database. Requires: % @ # &`,
		`/removedish <dish> - Removes a dish from the database. Requires: % @ # &`,
		`/viewdishes - Shows the entire database of dishes. Requires: % @ # &`,
	],
}; exports.commands = commands;

 const pages = {
	foodfight(query, user, connection) {
		if (!user.named) return Rooms.RETRY_AFTER_LOGIN;
		this.title = 'Foodfight';
		const room = Rooms.get('thecafe');
		if (!room) return this.errorReply(`Room not found.`);
		this.checkCan('mute', null, room);
		const content = Object.values(dishes).map(
			([dish, ...ingredients]) => React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 197}}, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 197}}, dish), React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 197}}, ingredients.join(', ')))
		).join('');

		return React.createElement('div', { class: "pad ladder" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 200}}
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 201}}, "Foodfight Dish list"  )
, content ?
				React.createElement('table', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, "Dishes")), React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, "Ingredients"))), content) :
				React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 204}}, "There are no dishes in the database."      )
			
);
	},
}; exports.pages = pages;

 //# sourceMappingURL=sourceMaps/thecafe.js.map