"use strict";const _jsxFileName = "..\\..\\server\\chat-commands\\avatars.tsx";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class;/**
 * Avatar commands
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT
 * @author Zarel <guangcongluo@gmail.com>
 */

var _lib = require('../../.lib-dist');

const AVATARS_FILE = 'config/avatars.json';

/**
 * Avatar IDs should be in one of these formats:
 * - 'cynthia' - official avatars in https://play.pokemonshowdown.com/sprites/trainers/
 * - '#splxraiders' - hosted custom avatars in https://play.pokemonshowdown.com/sprites/trainers-custom/
 * - 'example.png' - side server custom avatars in config/avatars/ in your server
 */

const AVATAR_FORMATS_MESSAGE = Config.serverid === 'showdown' ?
	"Custom avatars start with '#', like '#splxraiders'." :
	"Custom avatars look like 'example.png'. Custom avatars should be put in `config/avatars/`. Your server must be registered for custom avatars to work.";


















const customAvatars = Object.create(null);

try {
	const configAvatars = JSON.parse(_lib.FS.call(void 0, AVATARS_FILE).readSync());
	Object.assign(customAvatars, configAvatars);
} catch (e) {
	if (Config.customavatars) {
		for (const userid in Config.customavatars) {
			customAvatars[userid] = {allowed: [Config.customavatars[userid]]};
		}
	}
	if (Config.allowedavatars) {
		for (const avatar in Config.customavatars) {
			for (const userid of Config.customavatars[avatar]) {
				customAvatars[userid] ??= {allowed: [null]};
				customAvatars[userid].allowed.push(avatar);
			}
		}
	}
	_lib.FS.call(void 0, AVATARS_FILE).writeSync(JSON.stringify(customAvatars));
}
if ((Config.customavatars && Object.keys(Config.customavatars).length) || Config.allowedavatars) {
	Monitor.crashlog("Please remove 'customavatars' and 'allowedavatars' from Config (config/config.js). Your avatars have been migrated to the new '/addavatar' system.");
}
function saveCustomAvatars(instant) {
	_lib.FS.call(void 0, AVATARS_FILE).writeUpdate(() => JSON.stringify(customAvatars), {throttle: instant ? null : 60000});
}

 const Avatars = new (_class = class {constructor() { _class.prototype.__init.call(this); }
	__init() {this.avatars = customAvatars}
	userCanUse(user, avatar) {
		let validatedAvatar = null;
		for (const id of [user.id, ...user.previousIDs]) {
			validatedAvatar = exports.Avatars.canUse(id, avatar);
			if (validatedAvatar) break;
		}
		return validatedAvatar;
	}
	canUse(userid, avatar) {
		avatar = avatar.toLowerCase().replace(/[^a-z0-9-.]+/g, '');
		if (OFFICIAL_AVATARS.has(avatar)) return avatar;

		const customs = _optionalChain([customAvatars, 'access', _ => _[userid], 'optionalAccess', _2 => _2.allowed]);
		if (!customs) return null;

		if (customs.includes(avatar)) return avatar;
		if (customs.includes('#' + avatar)) return '#' + avatar;
		if (avatar.startsWith('#') && customs.includes(avatar.slice(1))) return avatar.slice(1);
		return null;
	}
	save(instant) {
		saveCustomAvatars(instant);
	}
	src(avatar) {
		if (avatar.includes('.')) return '';
		const avatarUrl = avatar.startsWith('#') ? `trainers-custom/${avatar.slice(1)}.png` : `trainers/${avatar}.png`;
		return `https://${Config.routes.client}/sprites/${avatarUrl}`;
	}
	exists(avatar) {
		if (avatar.includes('.')) {
			return _lib.FS.call(void 0, `config/avatars/${avatar}`).isFile();
		}
		if (!avatar.startsWith('#')) {
			return OFFICIAL_AVATARS.has(avatar);
		}
		return _lib.Net.call(void 0, exports.Avatars.src(avatar)).get().then(() => true).catch(() => false);
	}
	convert(avatar) {
		if (avatar.startsWith('#') && avatar.includes('.')) return avatar.slice(1);
		return avatar;
	}
	async validate(avatar, options) {
		avatar = this.convert(avatar);
		if (!/^#?[a-z0-9-]+$/.test(avatar) && !/^[a-z0-9.-]+$/.test(avatar)) {
			throw new Chat.ErrorMessage(`Avatar "${avatar}" is not in a valid format. ${AVATAR_FORMATS_MESSAGE}`);
		}
		if (!await this.exists(avatar)) {
			throw new Chat.ErrorMessage(`Avatar "${avatar}" doesn't exist. ${AVATAR_FORMATS_MESSAGE}`);
		}
		if (_optionalChain([options, 'optionalAccess', _3 => _3.rejectOfficial]) && /^[a-z0-9-]+$/.test(avatar)) {
			throw new Chat.ErrorMessage(`Avatar "${avatar}" is an official avatar that all users already have access to.`);
		}
		return avatar;
	}
	img(avatar, noAlt) {
		const src = exports.Avatars.src(avatar);
		if (!src) return React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 127}}, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 127}}, avatar));
		return React.createElement('img', {
			src: src, alt: noAlt ? '' : avatar, width: "80", height: "80", class: "pixelated", style: {verticalAlign: 'middle'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 128}}
		);
	}
	getDefault(userid) {
		const entry = customAvatars[userid];
		if (!entry) return null;
		const DECEMBER = 11; // famous JavaScript issue
		if (new Date().getMonth() === DECEMBER && entry.allowed.some(avatar => _optionalChain([avatar, 'optionalAccess', _4 => _4.endsWith, 'call', _5 => _5('xmas')]))) {
			return entry.allowed.find(avatar => _optionalChain([avatar, 'optionalAccess', _6 => _6.endsWith, 'call', _7 => _7('xmas')]));
		}
		return entry.default === undefined ? entry.allowed[0] : entry.default;
	}
	/** does not include validation */
	setDefault(userid, avatar) {
		if (avatar === this.getDefault(userid)) return;

		const entry = (customAvatars[userid] ??= {allowed: [null]});
		if (avatar === entry.allowed[0]) {
			delete entry.default;
		} else {
			entry.default = avatar;
		}
		saveCustomAvatars();
	}
	addAllowed(userid, avatar) {
		const entry = (customAvatars[userid] ??= {allowed: [null]});
		if (entry.allowed.includes(avatar)) return false;

		entry.allowed.push(avatar);
		entry.notNotified = true;
		this.tryNotify(Users.get(userid));
		return true;
	}
	removeAllowed(userid, avatar) {
		const entry = customAvatars[userid];
		if (!_optionalChain([entry, 'optionalAccess', _8 => _8.allowed, 'access', _9 => _9.includes, 'call', _10 => _10(avatar)])) return false;

		if (entry.allowed[0] === avatar) {
			entry.allowed[0] = null;
		} else {
			entry.allowed = entry.allowed.filter(a => a !== avatar) ;
		}
		if (!entry.allowed.some(Boolean)) delete customAvatars[userid];
		return true;
	}
	addPersonal(userid, avatar) {
		const entry = (customAvatars[userid] ??= {allowed: [null]});
		if (entry.allowed.includes(avatar)) return false;

		entry.timeReceived ||= Date.now();
		entry.timeUpdated = Date.now();
		if (!entry.allowed[0]) {
			entry.allowed[0] = avatar;
		} else {
			entry.allowed.unshift(avatar);
		}
		delete entry.default;
		entry.notNotified = true;
		this.tryNotify(Users.get(userid));
		return true;
	}
	handleLogin(user) {
		const avatar = this.getDefault(user.id);
		if (avatar) user.avatar = avatar;
		this.tryNotify(user);
	}
	tryNotify(user) {
		if (!user) return;

		const entry = customAvatars[user.id];
		if (_optionalChain([entry, 'optionalAccess', _11 => _11.notNotified])) {
			user.send(
				`|pm|&|${user.getIdentity()}|/raw ` +
				Chat.html`${React.createElement(React.Fragment, null
, React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 203}}, "You have a new custom avatar!"

)
, React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 206}}
, entry.allowed.map(avatar => avatar && [exports.Avatars.img(avatar), ' '])
), "Use "
 , React.createElement('button', { class: "button", name: "send", value: "/avatars", __self: this, __source: {fileName: _jsxFileName, lineNumber: 209}}, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 209}}, "/avatars")), " for usage instructions."
)}`
			);
			delete entry.notNotified;
			saveCustomAvatars();
		}
	}
}, _class); exports.Avatars = Avatars;

function listUsers(users) {
	return users.flatMap((userid, i) => [i ? ', ' : null, React.createElement('username', { class: "username", __self: this, __source: {fileName: _jsxFileName, lineNumber: 219}}, userid)]);
}

const OFFICIAL_AVATARS = new Set([
	'aaron',
	'acetrainercouple-gen3', 'acetrainercouple',
	'acetrainerf-gen1', 'acetrainerf-gen1rb', 'acetrainerf-gen2', 'acetrainerf-gen3', 'acetrainerf-gen3rs', 'acetrainerf-gen4dp', 'acetrainerf-gen4', 'acetrainerf',
	'acetrainer-gen1', 'acetrainer-gen1rb', 'acetrainer-gen2', 'acetrainer-gen3jp', 'acetrainer-gen3', 'acetrainer-gen3rs', 'acetrainer-gen4dp', 'acetrainer-gen4', 'acetrainer',
	'acetrainersnowf',
	'acetrainersnow',
	'agatha-gen1', 'agatha-gen1rb', 'agatha-gen3',
	'alder',
	'anabel-gen3',
	'archer',
	'archie-gen3',
	'argenta',
	'ariana',
	'aromalady-gen3', 'aromalady-gen3rs', 'aromalady',
	'artist-gen4', 'artist',
	'ash-alola', 'ash-hoenn', 'ash-kalos', 'ash-unova', 'ash-capbackward', 'ash-johto', 'ash-sinnoh', 'ash',
	'backersf',
	'backers',
	'backpackerf',
	'backpacker',
	'baker',
	'barry',
	'battlegirl-gen3', 'battlegirl-gen4', 'battlegirl',
	'beauty-gen1', 'beauty-gen1rb', 'beauty-gen2jp', 'beauty-gen2', 'beauty-gen3', 'beauty-gen3rs', 'beauty-gen4dp', 'beauty-gen5bw2', 'beauty',
	'bellelba',
	'bellepa',
	'benga',
	'bertha',
	'bianca-pwt', 'bianca',
	'biker-gen1', 'biker-gen1rb', 'biker-gen2', 'biker-gen3', 'biker-gen4', 'biker',
	'bill-gen3',
	'birch-gen3',
	'birdkeeper-gen1', 'birdkeeper-gen1rb', 'birdkeeper-gen2', 'birdkeeper-gen3', 'birdkeeper-gen3rs', 'birdkeeper-gen4dp', 'birdkeeper',
	'blackbelt-gen1', 'blackbelt-gen1rb', 'blackbelt-gen2', 'blackbelt-gen3', 'blackbelt-gen3rs', 'blackbelt-gen4dp', 'blackbelt-gen4', 'blackbelt',
	'blaine-gen1', 'blaine-gen1rb', 'blaine-gen2', 'blaine-gen3', 'blaine',
	'blue-gen1champion', 'blue-gen1', 'blue-gen1rbchampion', 'blue-gen1rb', 'blue-gen1rbtwo', 'blue-gen1two', 'blue-gen2', 'blue-gen3champion', 'blue-gen3', 'blue-gen3two', 'blue',
	'boarder-gen2', 'boarder',
	'brandon-gen3',
	'brawly-gen3', 'brawly',
	'brendan-gen3', 'brendan-gen3rs',
	'brock-gen1', 'brock-gen1rb', 'brock-gen2', 'brock-gen3', 'brock',
	'bruno-gen1', 'bruno-gen1rb', 'bruno-gen2', 'bruno-gen3', 'bruno',
	'brycenman',
	'brycen',
	'buck',
	'bugcatcher-gen1', 'bugcatcher-gen1rb', 'bugcatcher-gen2', 'bugcatcher-gen3', 'bugcatcher-gen3rs', 'bugcatcher-gen4dp', 'bugcatcher',
	'bugmaniac-gen3',
	'bugsy-gen2', 'bugsy',
	'burgh',
	'burglar-gen1', 'burglar-gen1rb', 'burglar-gen2', 'burglar-gen3', 'burglar',
	'byron',
	'caitlin-gen4', 'caitlin',
	'cameraman',
	'camper-gen2', 'camper-gen3', 'camper-gen3rs', 'camper',
	'candice',
	'channeler-gen1', 'channeler-gen1rb', 'channeler-gen3',
	'cheren-gen5bw2', 'cheren',
	'cheryl',
	'chili',
	'chuck-gen2', 'chuck',
	'cilan',
	'clair-gen2', 'clair',
	'clay',
	'clemont',
	'clerkf',
	'clerk-boss', 'clerk',
	'clown',
	'collector-gen3', 'collector',
	'colress',
	'courtney-gen3',
	'cowgirl',
	'crasherwake',
	'cress',
	'crushgirl-gen3',
	'crushkin-gen3',
	'cueball-gen1', 'cueball-gen1rb', 'cueball-gen3',
	'cyclistf-gen4', 'cyclistf',
	'cyclist-gen4', 'cyclist',
	'cynthia-gen4', 'cynthia',
	'cyrus',
	'dahlia',
	'daisy-gen3',
	'dancer',
	'darach-caitlin', 'darach',
	'dawn-gen4pt', 'dawn',
	'depotagent',
	'doctor',
	'doubleteam',
	'dragontamer-gen3', 'dragontamer',
	'drake-gen3',
	'drayden',
	'elesa-gen5bw2', 'elesa',
	'emmet',
	'engineer-gen1', 'engineer-gen1rb', 'engineer-gen3',
	'erika-gen1', 'erika-gen1rb', 'erika-gen2', 'erika-gen3', 'erika',
	'ethan-gen2c', 'ethan-gen2', 'ethan-pokeathlon', 'ethan',
	'eusine-gen2', 'eusine',
	'expertf-gen3',
	'expert-gen3',
	'falkner-gen2',
	'falkner',
	'fantina',
	'firebreather-gen2',
	'firebreather',
	'fisherman-gen1', 'fisherman-gen1rb', 'fisherman-gen2jp', 'fisherman-gen3', 'fisherman-gen3rs', 'fisherman-gen4', 'fisherman',
	'flannery-gen3', 'flannery',
	'flint',
	'galacticgruntf',
	'galacticgrunt',
	'gambler-gen1', 'gambler-gen1rb', 'gambler',
	'gamer-gen3',
	'gardenia',
	'gentleman-gen1', 'gentleman-gen1rb', 'gentleman-gen2', 'gentleman-gen3', 'gentleman-gen3rs', 'gentleman-gen4dp', 'gentleman-gen4', 'gentleman',
	'ghetsis-gen5bw', 'ghetsis',
	'giovanni-gen1', 'giovanni-gen1rb', 'giovanni-gen3', 'giovanni',
	'glacia-gen3',
	'greta-gen3',
	'grimsley',
	'guitarist-gen2', 'guitarist-gen3', 'guitarist-gen4', 'guitarist',
	'harlequin',
	'hexmaniac-gen3jp', 'hexmaniac-gen3',
	'hiker-gen1', 'hiker-gen1rb', 'hiker-gen2', 'hiker-gen3', 'hiker-gen3rs', 'hiker-gen4', 'hiker',
	'hilbert-wonderlauncher', 'hilbert',
	'hilda-wonderlauncher', 'hilda',
	'hooligans',
	'hoopster',
	'hugh',
	'idol',
	'infielder',
	'ingo',
	'interviewers-gen3',
	'interviewers',
	'iris-gen5bw2', 'iris',
	'janine-gen2', 'janine',
	'janitor',
	'jasmine-gen2', 'jasmine',
	'jessiejames-gen1',
	'jogger',
	'jrtrainerf-gen1', 'jrtrainerf-gen1rb',
	'jrtrainer-gen1', 'jrtrainer-gen1rb',
	'juan-gen3',
	'juan',
	'juggler-gen1', 'juggler-gen1rb', 'juggler-gen2', 'juggler-gen3', 'juggler',
	'juniper',
	'jupiter',
	'karen-gen2', 'karen',
	'kimonogirl-gen2', 'kimonogirl',
	'kindler-gen3',
	'koga-gen1', 'koga-gen2', 'koga-gen1rb', 'koga-gen3', 'koga',
	'kris-gen2',
	'lady-gen3', 'lady-gen3rs', 'lady-gen4', 'lady',
	'lance-gen1', 'lance-gen1rb', 'lance-gen2', 'lance-gen3', 'lance',
	'lass-gen1', 'lass-gen1rb', 'lass-gen2', 'lass-gen3', 'lass-gen3rs', 'lass-gen4dp', 'lass-gen4', 'lass',
	'leaf-gen3',
	'lenora',
	'linebacker',
	'li',
	'liza',
	'lorelei-gen1', 'lorelei-gen1rb', 'lorelei-gen3',
	'ltsurge-gen1', 'ltsurge-gen1rb', 'ltsurge-gen2', 'ltsurge-gen3', 'ltsurge',
	'lucas-gen4pt', 'lucas',
	'lucian',
	'lucy-gen3',
	'lyra-pokeathlon', 'lyra',
	'madame-gen4dp', 'madame-gen4', 'madame',
	'maid-gen4', 'maid',
	'marley',
	'marlon',
	'marshal',
	'mars',
	'matt-gen3',
	'maxie-gen3',
	'may-gen3', 'may-gen3rs',
	'maylene',
	'medium-gen2jp', 'medium',
	'mira',
	'misty-gen1', 'misty-gen2', 'misty-gen1rb', 'misty-gen3', 'misty',
	'morty-gen2', 'morty',
	'mrfuji-gen3',
	'musician',
	'nate-wonderlauncher', 'nate',
	'ninjaboy-gen3', 'ninjaboy',
	'noland-gen3',
	'norman-gen3', 'norman',
	'n',
	'nurse',
	'nurseryaide',
	'oak-gen1', 'oak-gen1rb', 'oak-gen2', 'oak-gen3',
	'officer-gen2',
	'oldcouple-gen3',
	'painter-gen3',
	'palmer',
	'parasollady-gen3', 'parasollady-gen4', 'parasollady',
	'petrel',
	'phoebe-gen3',
	'picnicker-gen2', 'picnicker-gen3', 'picnicker-gen3rs', 'picnicker',
	'pilot',
	'plasmagruntf-gen5bw', 'plasmagruntf',
	'plasmagrunt-gen5bw', 'plasmagrunt',
	'pokefanf-gen2', 'pokefanf-gen3', 'pokefanf-gen4', 'pokefanf',
	'pokefan-gen2', 'pokefan-gen3', 'pokefan-gen4', 'pokefan',
	'pokekid',
	'pokemaniac-gen1', 'pokemaniac-gen1rb', 'pokemaniac-gen2', 'pokemaniac-gen3', 'pokemaniac-gen3rs', 'pokemaniac',
	'pokemonbreederf-gen3', 'pokemonbreederf-gen3frlg', 'pokemonbreederf-gen4', 'pokemonbreederf',
	'pokemonbreeder-gen3', 'pokemonbreeder-gen4', 'pokemonbreeder',
	'pokemonrangerf-gen3', 'pokemonrangerf-gen3rs', 'pokemonrangerf-gen4', 'pokemonrangerf',
	'pokemonranger-gen3', 'pokemonranger-gen3rs', 'pokemonranger-gen4', 'pokemonranger',
	'policeman-gen4', 'policeman',
	'preschoolerf',
	'preschooler',
	'proton',
	'pryce-gen2', 'pryce',
	'psychicf-gen3', 'psychicf-gen3rs', 'psychicf-gen4', 'psychicfjp-gen3', 'psychicf',
	'psychic-gen1', 'psychic-gen1rb', 'psychic-gen2', 'psychic-gen3', 'psychic-gen3rs', 'psychic-gen4', 'psychic',
	'rancher',
	'red-gen1main', 'red-gen1', 'red-gen1rb', 'red-gen1title', 'red-gen2', 'red-gen3', 'red',
	'reporter',
	'richboy-gen3', 'richboy-gen4', 'richboy',
	'riley',
	'roark',
	'rocker-gen1', 'rocker-gen1rb', 'rocker-gen3',
	'rocket-gen1', 'rocket-gen1rb',
	'rocketgruntf-gen2', 'rocketgruntf',
	'rocketgrunt-gen2', 'rocketgrunt',
	'rocketexecutivef-gen2',
	'rocketexecutive-gen2',
	'rood',
	'rosa-wonderlauncher', 'rosa',
	'roughneck-gen4', 'roughneck',
	'roxanne-gen3', 'roxanne',
	'roxie',
	'ruinmaniac-gen3', 'ruinmaniac-gen3rs', 'ruinmaniac',
	'sabrina-gen1', 'sabrina-gen1rb', 'sabrina-gen2', 'sabrina-gen3', 'sabrina',
	'sage-gen2', 'sage-gen2jp', 'sage',
	'sailor-gen1', 'sailor-gen1rb', 'sailor-gen2', 'sailor-gen3jp', 'sailor-gen3', 'sailor-gen3rs', 'sailor',
	'saturn',
	'schoolboy-gen2',
	'schoolkidf-gen3', 'schoolkidf-gen4', 'schoolkidf',
	'schoolkid-gen3', 'schoolkid-gen4dp', 'schoolkid-gen4', 'schoolkid',
	'scientistf',
	'scientist-gen1', 'scientist-gen1rb', 'scientist-gen2', 'scientist-gen3', 'scientist-gen4dp', 'scientist-gen4', 'scientist',
	'shadowtriad',
	'shauntal',
	'shelly-gen3',
	'sidney-gen3',
	'silver-gen2kanto', 'silver-gen2', 'silver',
	'sisandbro-gen3', 'sisandbro-gen3rs', 'sisandbro',
	'skierf-gen4dp', 'skierf',
	'skier-gen2', 'skier',
	'skyla',
	'smasher',
	'spenser-gen3',
	'srandjr-gen3',
	'steven-gen3', 'steven',
	'striker',
	'supernerd-gen1', 'supernerd-gen1rb', 'supernerd-gen2', 'supernerd-gen3', 'supernerd',
	'swimmerf-gen2', 'swimmerf-gen3', 'swimmerf-gen3rs', 'swimmerf-gen4dp', 'swimmerf-gen4', 'swimmerfjp-gen2', 'swimmerf',
	'swimmer-gen1', 'swimmer-gen1rb', 'swimmer-gen4dp', 'swimmer-gen4jp', 'swimmer-gen4', 'swimmerm-gen2', 'swimmerm-gen3', 'swimmerm-gen3rs', 'swimmer',
	'tabitha-gen3',
	'tamer-gen1', 'tamer-gen1rb', 'tamer-gen3',
	'tateandliza-gen3',
	'tate',
	'teacher-gen2', 'teacher',
	'teamaquabeta-gen3',
	'teamaquagruntf-gen3',
	'teamaquagruntm-gen3',
	'teammagmagruntf-gen3',
	'teammagmagruntm-gen3',
	'teamrocketgruntf-gen3',
	'teamrocketgruntm-gen3',
	'teamrocket',
	'thorton',
	'triathletebikerf-gen3',
	'triathletebikerm-gen3',
	'triathleterunnerf-gen3',
	'triathleterunnerm-gen3',
	'triathleteswimmerf-gen3',
	'triathleteswimmerm-gen3',
	'tuberf-gen3', 'tuberf-gen3rs', 'tuberf',
	'tuber-gen3', 'tuber',
	'tucker-gen3',
	'twins-gen2', 'twins-gen3', 'twins-gen3rs', 'twins-gen4dp', 'twins-gen4', 'twins',
	'unknownf',
	'unknown',
	'veteranf',
	'veteran-gen4', 'veteran',
	'volkner',
	'waiter-gen4dp', 'waiter-gen4', 'waiter',
	'waitress-gen4', 'waitress',
	'wallace-gen3', 'wallace-gen3rs', 'wallace',
	'wally-gen3',
	'wattson-gen3', 'wattson',
	'whitney-gen2', 'whitney',
	'will-gen2', 'will',
	'winona-gen3', 'winona',
	'worker-gen4',
	'workerice',
	'worker',
	'yellow',
	'youngcouple-gen3', 'youngcouple-gen3rs', 'youngcouple-gen4dp', 'youngcouple',
	'youngster-gen1', 'youngster-gen1rb', 'youngster-gen2', 'youngster-gen3', 'youngster-gen3rs', 'youngster-gen4', 'youngster-gen4dp', 'youngster',
	'zinzolin',
]);

const OFFICIAL_AVATARS_BELIOT419 = new Set([
	'acerola', 'aetheremployee', 'aetheremployeef', 'aetherfoundation', 'aetherfoundationf', 'anabel',
	'beauty-gen7', 'blue-gen7', 'burnet', 'colress-gen7', 'dexio', 'elio', 'faba', 'gladion-stance',
	'gladion', 'grimsley-gen7', 'hapu', 'hau-stance', 'hau', 'hiker-gen7', 'ilima', 'kahili', 'kiawe',
	'kukui-stand', 'kukui', 'lana', 'lass-gen7', 'lillie-z', 'lillie', 'lusamine-nihilego', 'lusamine',
	'mallow', 'mina', 'molayne', 'nanu', 'officeworker', 'olivia', 'plumeria', 'pokemonbreeder-gen7',
	'pokemonbreederf-gen7', 'preschoolers', 'red-gen7', 'risingstar', 'risingstarf', 'ryuki',
	'samsonoak', 'selene', 'sightseer', 'sina', 'sophocles', 'teacher-gen7', 'theroyal', 'wally',
	'wicke', 'youngathlete', 'youngathletef', 'youngster-gen7',
]);

const OFFICIAL_AVATARS_GNOMOWLADNY = new Set([
	'az', 'brawly-gen6', 'bryony', 'drasna', 'evelyn', 'furisodegirl-black', 'furisodegirl-pink', 'guzma',
	'hala', 'korrina', 'malva', 'nita', 'olympia', 'ramos', 'shelly', 'sidney', 'siebold', 'tierno',
	'valerie', 'viola', 'wallace-gen6', 'wikstrom', 'winona-gen6', 'wulfric', 'xerosic', 'youngn', 'zinnia',
]);

const OFFICIAL_AVATARS_BRUMIRAGE = new Set([
	'adaman', 'agatha-lgpe', 'akari', 'allister', 'archie-gen6', 'arezu', 'avery', 'ballguy', 'bea', 'bede',
	'bede-leader', 'brendan-contest', 'burnet-radar', 'calaba', 'calem', 'chase', 'cogita', 'doctor-gen8',
	'elaine', 'gloria', 'gordie', 'hop', 'irida', 'kabu', 'klara', 'koga-lgpe', 'leon', 'leon-tower',
	'lian', 'lisia', 'lorelei-lgpe', 'magnolia', 'mai', 'marnie', 'may-contest', 'melony', 'milo', 'mina-lgpe',
	'mustard', 'mustard-master', 'nessa', 'oleana', 'opal', 'peonia', 'peony', 'pesselle', 'phoebe-gen6', 'piers',
	'raihan', 'rei', 'rose', 'sabi', 'sanqua', 'shielbert', 'sonia', 'sonia-professor', 'sordward', 'sordward-shielbert',
	'tateandliza-gen6', 'victor', 'victor-dojo', 'volo', 'yellgrunt', 'yellgruntf', 'zisu',
]);

const OFFICIAL_AVATARS_ZACWEAVILE = new Set([
	'gloria-dojo', 'shauna',
]);

const OFFICIAL_AVATARS_KYLEDOVE = new Set([
	'artist-gen8', 'backpacker-gen8', 'beauty-gen8', 'blackbelt-gen8', 'cabbie', 'cafemaster', 'cameraman-gen8',
	'clerk-gen8', 'clerkf-gen8', 'cook', 'dancer-gen8', 'doctorf-gen8', 'fisher-gen8', 'gentleman-gen8',
	'hiker-gen8', 'lass-gen8', 'leaguestaff', 'leaguestafff', 'madame-gen8', 'model-gen8', 'musician-gen8',
	'pokekid-gen8', 'pokekidf-gen8', 'pokemonbreeder-gen8', 'pokemonbreederf-gen8', 'policeman-gen8', 'postman',
	'railstaff', 'reporter-gen8', 'schoolkid-gen8', 'schoolkidf-gen8', 'swimmer-gen8', 'swimmerf-gen8',
	'worker-gen8', 'workerf-gen8', 'youngster-gen8',
]);

const OFFICIAL_AVATARS_HYOOPPA = new Set([
	'brendan', 'maxie-gen6', 'may',
]);

for (const avatar of OFFICIAL_AVATARS_BELIOT419) OFFICIAL_AVATARS.add(avatar);
for (const avatar of OFFICIAL_AVATARS_GNOMOWLADNY) OFFICIAL_AVATARS.add(avatar);
for (const avatar of OFFICIAL_AVATARS_BRUMIRAGE) OFFICIAL_AVATARS.add(avatar);
for (const avatar of OFFICIAL_AVATARS_ZACWEAVILE) OFFICIAL_AVATARS.add(avatar);
for (const avatar of OFFICIAL_AVATARS_KYLEDOVE) OFFICIAL_AVATARS.add(avatar);
for (const avatar of OFFICIAL_AVATARS_HYOOPPA) OFFICIAL_AVATARS.add(avatar);

 const commands = {
	avatar(target, room, user) {
		if (!target) return this.parse(`${this.cmdToken}avatars`);
		const [maybeAvatar, silent] = target.split(',');
		const avatar = exports.Avatars.userCanUse(user, maybeAvatar);

		if (!avatar) {
			if (silent) return false;
			this.errorReply("Unrecognized avatar - make sure you're on the right account?");
			return false;
		}

		user.avatar = avatar;
		if (user.id in customAvatars && !avatar.endsWith('xmas')) {
			exports.Avatars.setDefault(user.id, avatar);
		}
		if (!silent) {
			this.sendReply(
				`${this.tr`Avatar changed to:`}\n` +
				Chat.html`|raw|${exports.Avatars.img(avatar)}`
			);
			if (OFFICIAL_AVATARS_BELIOT419.has(avatar)) {
				this.sendReply(`|raw|(${this.tr`Artist: `}<a href="https://www.deviantart.com/beliot419">Beliot419</a>)`);
			}
			if (OFFICIAL_AVATARS_GNOMOWLADNY.has(avatar)) {
				this.sendReply(`|raw|(${this.tr`Artist: `}Gnomowladny)`);
			}
			if (OFFICIAL_AVATARS_BRUMIRAGE.has(avatar)) {
				this.sendReply(`|raw|(${this.tr`Artist: `}<a href="https://twitter.com/Brumirage">Brumirage</a>)`);
			}
			if (OFFICIAL_AVATARS_ZACWEAVILE.has(avatar)) {
				this.sendReply(`|raw|(${this.tr`Artist: `}ZacWeavile)`);
			}
			if (OFFICIAL_AVATARS_KYLEDOVE.has(avatar)) {
				this.sendReply(`|raw|(${this.tr`Artist: `}<a href="https://twitter.com/DoveKyle">Kyledove</a>)`);
			}
			if (OFFICIAL_AVATARS_HYOOPPA.has(avatar)) {
				this.sendReply(`|raw|(${this.tr`Artist: `}<a href="https://twitter.com/hyo_oppa">hyo-oppa</a>)`);
			}
		}
	},
	avatarhelp: [`/avatar [avatar name or number] - Change your trainer sprite.`],

	avatars(target, room, user) {
		this.runBroadcast();

		if (target.startsWith('#')) return this.parse(`/avatarusers ${target}`);

		const targetUser = this.broadcasting && !target ? null : this.getUserOrSelf(target);
		const targetUserids = targetUser ? new Set([targetUser.id, ...targetUser.previousIDs]) :
			target ? new Set([toID(target)]) : null;
		if (targetUserids && targetUser !== user && !user.can('alts')) {
			throw new Chat.ErrorMessage("You don't have permission to look at another user's avatars!");
		}

		const out = [];
		if (targetUserids) {
			const hasButton = !this.broadcasting && targetUser === user;
			for (const id of targetUserids) {
				const allowed = _optionalChain([customAvatars, 'access', _12 => _12[id], 'optionalAccess', _13 => _13.allowed]);
				if (allowed) {
					out.push(
						React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 640}}, "Custom avatars from account "    , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 640}}, id), ":"),
						allowed.filter(Boolean).map(avatar => (
							React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 642}}
, hasButton ?
									React.createElement('button', { name: "send", value: `/avatar ${avatar}`, class: "button", __self: this, __source: {fileName: _jsxFileName, lineNumber: 644}}, exports.Avatars.img(avatar)) :
									exports.Avatars.img(avatar)
								, " " 
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 647}}, "/avatar " , avatar.replace('#', ''))
)
						))
					);
				}
			}
			if (!out.length && target) {
				out.push(React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 654}}, "User " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 654}}, toID(target)), " doesn't have any custom avatars."     ));
			}
		}
		if (!out.length) {
			out.push(React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 658}}, "Custom avatars require you to be a contributor/staff or win a tournament prize."            ));
		}

		this.sendReplyBox(React.createElement(React.Fragment, null
, !target && [React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 662}}, "You can "
  , React.createElement('button', { name: "avatars", class: "button", __self: this, __source: {fileName: _jsxFileName, lineNumber: 663}}, "change your avatar"  ), " by clicking on it in the "       
, React.createElement('button', { name: "openOptions", class: "button", 'aria-label': "Options", __self: this, __source: {fileName: _jsxFileName, lineNumber: 664}}, React.createElement('i', { class: "fa fa-cog" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 664}})), " menu in the upper "     , "right."

), React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 666}}, "Avatars from generations other than 3-5 are hidden. You can find them in this "
              
, React.createElement('a', { href: "https://play.pokemonshowdown.com/sprites/trainers/", __self: this, __source: {fileName: _jsxFileName, lineNumber: 668}}, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 668}}, "full list of avatars"   )), ". " , "You can use them by typing "
      , React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 669}}, "/avatar " , React.createElement('i', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 669}}, "[avatar's name]" )), " into any chat. For example, "      
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 670}}, "/avatar erika-gen2" ), "."
)]
, out
));
	},
	avatarshelp: [
		`/avatars - Explains how to change avatars.`,
		`/avatars [username] - Shows custom avatars available to a user.`,
		`!avatars - Show everyone that information. Requires: + % @ # &`,
	],

	addavatar() {
		this.sendReply("Is this a personal avatar or a group avatar?");
		return this.parse(`/help addavatar`);
	},
	addavatarhelp: [
		`/personalavatar [username], [avatar] - Gives a user a default (personal) avatar.`,
		`/groupavatar [username], [avatar] - Gives a user an allowed (group) avatar.`,
		`/removeavatar [username], [avatar] - Removes access to an avatar from a user.`,
		`/removeavatar [username] - Removes access to all custom avatars from a user.`,
		AVATAR_FORMATS_MESSAGE,
	],

	personalavatar: 'defaultavatar',
	async defaultavatar(target, room, user) {
		this.checkCan('bypassall');
		if (!target) return this.parse(`/help defaultavatar`);
		const [inputUsername, inputAvatar] = this.splitOne(target);
		if (!Users.isUsername(inputUsername)) {
			throw new Chat.ErrorMessage(`"${inputUsername}" is not a valid username.`);
		}
		const userid = toID(inputUsername);
		const avatar = await exports.Avatars.validate(inputAvatar, {rejectOfficial: true});

		if (!exports.Avatars.addPersonal(userid, avatar)) {
			throw new Chat.ErrorMessage(`User "${inputUsername}" can already use avatar "${avatar}".`);
		}
		this.globalModlog('PERSONAL AVATAR', userid, avatar);
		this.sendReplyBox(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 708}}
, exports.Avatars.img(avatar), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 709}} ), "Added to "
  , React.createElement('username', { class: "username", __self: this, __source: {fileName: _jsxFileName, lineNumber: 710}}, inputUsername)
));
	},
	defaultavatarhelp: 'addavatarhelp',

	allowedavatar: 'allowavatar',
	groupavatar: 'allowavatar',
	async allowavatar(target, room, user) {
		this.checkCan('bypassall');
		if (!target) return this.parse(`/help defaultavatar`);
		const [inputUsername, inputAvatar] = this.splitOne(target);
		if (!Users.isUsername(inputUsername)) {
			throw new Chat.ErrorMessage(`"${inputUsername}" is not a valid username.`);
		}
		const userid = toID(inputUsername);
		const avatar = await exports.Avatars.validate(inputAvatar, {rejectOfficial: true});

		if (!exports.Avatars.addAllowed(userid, avatar)) {
			throw new Chat.ErrorMessage(`User "${inputUsername}" can already use avatar "${avatar}".`);
		}
		this.globalModlog('GROUP AVATAR', userid, avatar);
		this.sendReplyBox(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 731}}
, exports.Avatars.img(avatar), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 732}} ), "Added to "
  , React.createElement('username', { class: "username", __self: this, __source: {fileName: _jsxFileName, lineNumber: 733}}, inputUsername)
));
	},
	allowavatarhelp: 'addavatarhelp',

	denyavatar: 'removeavatar',
	disallowavatar: 'removeavatar',
	removeavatars: 'removeavatar',
	removeavatar(target, room, user) {
		this.checkCan('bypassall');
		if (!target) return this.parse(`/help defaultavatar`);
		const [inputUsername, inputAvatar] = this.splitOne(target);
		if (!Users.isUsername(inputUsername)) {
			throw new Chat.ErrorMessage(`"${inputUsername}" is not a valid username.`);
		}
		const userid = toID(inputUsername);
		const avatar = exports.Avatars.convert(inputAvatar);

		const allowed = _optionalChain([customAvatars, 'access', _14 => _14[userid], 'optionalAccess', _15 => _15.allowed, 'access', _16 => _16.filter, 'call', _17 => _17(Boolean)]);
		if (!allowed) {
			throw new Chat.ErrorMessage(`${inputUsername} doesn't have any custom avatars.`);
		}
		if (avatar) {
			if (!exports.Avatars.removeAllowed(userid, avatar)) {
				throw new Chat.ErrorMessage(`${inputUsername} doesn't have access to avatar "${avatar}"`);
			}
			this.globalModlog('REMOVE AVATAR', userid, avatar);
			this.sendReplyBox(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 760}}
, exports.Avatars.img(avatar), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 761}} ), "Removed from "
  , React.createElement('username', { class: "username", __self: this, __source: {fileName: _jsxFileName, lineNumber: 762}}, inputUsername)
));
		} else {
			// delete all
			delete customAvatars[userid];
			exports.Avatars.save();
			this.globalModlog('REMOVE AVATARS', userid, allowed.join(','));
			this.sendReplyBox(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 769}}
, allowed.map(curAvatar => [exports.Avatars.img(curAvatar), ' ']), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 770}} ), "Removed from "
  , React.createElement('username', { class: "username", __self: this, __source: {fileName: _jsxFileName, lineNumber: 771}}, inputUsername)
));
		}
	},
	removeavatarhelp: 'addavatarhelp',

	async avatarusers(target, room, user) {
		target = '#' + toID(target);
		if (!exports.Avatars.userCanUse(user, target) && !user.can('alts')) {
			throw new Chat.ErrorMessage(`You don't have access to avatar "${target}"`);
		}

		this.runBroadcast();

		const users = [];
		for (const userid in customAvatars) {
			if (customAvatars[userid].allowed.includes(target)) {
				users.push(userid);
			}
		}
		users.sort();

		if (!users.length && !await exports.Avatars.exists(target)) {
			throw new Chat.ErrorMessage(`Unrecognized avatar "${target}"`);
		}

		this.sendReplyBox(React.createElement(React.Fragment, null
, React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 798}}, exports.Avatars.img(target, true))
, React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 799}}
, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 800}}, target), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 800}} )
, users ? listUsers(users) : React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 801}}, "No users currently allowed to use this avatar"       )
)
));
	},

	moveavatars(target, room, user) {
		this.checkCan('bypassall');
		const [from, to] = target.split(',').map(toID);
		if (!from || !to) {
			return this.parse(`/help moveavatars`);
		}
		if (!_optionalChain([customAvatars, 'access', _18 => _18[from], 'optionalAccess', _19 => _19.allowed, 'access', _20 => _20.length])) {
			return this.errorReply(`That user has no avatars.`);
		}
		const existing = _optionalChain([customAvatars, 'access', _21 => _21[to], 'optionalAccess', _22 => _22.allowed, 'access', _23 => _23.filter, 'call', _24 => _24(Boolean)]);
		customAvatars[to] = {...customAvatars[from]};
		delete customAvatars[from];
		if (existing) {
			for (const avatar of existing) {
				if (!customAvatars[to].allowed.includes(avatar)) {
					customAvatars[to].allowed.push(avatar);
				}
			}
		}
		exports.Avatars.save(true);
		this.sendReply(`Moved ${from}'s avatars to '${to}'.`);
		this.globalModlog(`MOVEAVATARS`, to, `from ${from}`);
		exports.Avatars.tryNotify(Users.get(to));
	},
	moveavatarshelp: [
		`/moveavatars [from user], [to user] - Move all of the custom avatars from [from user] to [to user]. Requires: &`,
	],

	async masspavatar(target, room, user) {
		this.checkCan('bypassall');

		const usernames = target.trim().split(/\s*\n|,\s*/)
			.map(username => username.endsWith('.png') ? username.slice(0, -4) : username);
		for (const username of usernames) {
			if (!Users.isUsername(username)) {
				throw new Chat.ErrorMessage(`Invalid username "${username}"`);
			}
			await exports.Avatars.validate('#' + toID(username));
		}

		const userids = usernames.map(toID);
		for (const userid of userids) {
			const avatar = '#' + userid;
			exports.Avatars.addPersonal(userid, avatar);
			this.globalModlog('PERSONAL AVATAR', userid, avatar);
		}
		this.sendReplyBox(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 852}}
, userids.map(userid => exports.Avatars.img('#' + userid)), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 853}} ), "Added "
 , userids.length, " avatars"
));
	},
	async massxmasavatar(target, room, user) {
		this.checkCan('bypassall');

		const usernames = target.trim().split(/\s*\n|,\s*/)
			.map(username => username.endsWith('.png') ? username.slice(0, -4) : username)
			.map(username => username.endsWith('xmas') ? username.slice(0, -4) : username);
		for (const username of usernames) {
			if (!Users.isUsername(username)) {
				throw new Chat.ErrorMessage(`Invalid username "${username}"`);
			}
			await exports.Avatars.validate(`#${toID(username)}xmas`);
		}

		const userids = usernames.map(toID);
		for (const userid of userids) {
			const avatar = `#${userid}xmas`;
			exports.Avatars.addAllowed(userid, avatar);
			this.globalModlog('GROUP AVATAR', userid, avatar);
		}
		this.sendReplyBox(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 876}}
, userids.map(userid => exports.Avatars.img(`#${userid}xmas`)), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 877}} ), "Added "
 , userids.length, " avatars"
));
	},
	async massgavatar(target, room, user) {
		this.checkCan('bypassall');

		const args = target.trim().split(/\s*\n|,\s*/);
		let curAvatar = '';
		const toUpdate = Object.create(null);
		for (const arg of args) {
			if (arg.startsWith('#')) {
				curAvatar = await exports.Avatars.validate(arg);
			} else {
				if (!curAvatar) return this.parse(`/help massgavatar`);
				if (!/[A-Za-z0-9]/.test(arg.charAt(0)) || !/[A-Za-z]/.test(arg)) {
					throw new Chat.ErrorMessage(`Invalid username "${arg}"`);
				}
				(toUpdate[curAvatar] ??= new Set()).add(toID(arg));
			}
		}

		const out = [];

		for (const avatar in toUpdate) {
			const newUsers = toUpdate[avatar];
			const oldUsers = new Set();
			for (const userid in customAvatars) {
				if (customAvatars[userid].allowed.includes(avatar)) {
					oldUsers.add(userid );
				}
			}

			const added = [];
			for (const newUser of newUsers) {
				if (!oldUsers.has(newUser)) {
					exports.Avatars.addAllowed(newUser, avatar);
					added.push(newUser);
					this.globalModlog('GROUP AVATAR', newUser, avatar);
				}
			}
			const removed = [];
			for (const oldUser of oldUsers) {
				if (!newUsers.has(oldUser)) {
					exports.Avatars.removeAllowed(oldUser, avatar);
					removed.push(oldUser);
					this.globalModlog('REMOVE AVATAR', oldUser, avatar);
				}
			}

			out.push(React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 927}}, exports.Avatars.img(avatar, true)));
			out.push(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 928}}, React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 928}}, avatar)));
			if (added.length) out.push(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 929}}, oldUsers.size ? 'Added' : 'New', ": " , listUsers(added)));
			if (removed.length) out.push(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 930}}, "Removed: " , listUsers(removed)));
			if (!added.length && !removed.length) out.push(React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 931}}, "No change" ));
		}

		this.sendReplyBox(React.createElement(React.Fragment, null, out));
		exports.Avatars.save(true);
	},
}; exports.commands = commands;

Users.Avatars = exports.Avatars;

Chat.multiLinePattern.register(
	'/massgavatar', '/masspavatar', '/massxmasavatar',
);

 //# sourceMappingURL=sourceMaps/avatars.js.map