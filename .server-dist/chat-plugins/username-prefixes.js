"use strict";Object.defineProperty(exports, "__esModule", {value: true});/**
 * Code to manage username prefixes that force battles to be public or disable modchat.
 * @author Annika
 */

var _lib = require('../../.lib-dist');

const PREFIXES_FILE = 'config/chat-plugins/username-prefixes.json';
const PREFIX_DURATION = 10 * 24 * 60 * 60 * 1000;

 class PrefixManager {
	/** prefix:timeout */
	__init() {this.timeouts = new Map()}
	constructor() {;PrefixManager.prototype.__init.call(this);
		// after a restart/newly using the plugin, load prefixes from config.js
		if (!Chat.oldPlugins['username-prefixes']) this.refreshConfig(true);
	}

	save() {
		_lib.FS.call(void 0, PREFIXES_FILE).writeUpdate(() => JSON.stringify(Config.forcedprefixes || []));
	}

	refreshConfig(configJustLoaded = false) {
		if (!Config.forcedprefixes) Config.forcedprefixes = [];
		// ensure everything is in the right format
		if (!Array.isArray(Config.forcedprefixes)) {
			const convertedPrefixes = [];
			for (const type in Config.forcedprefixes) {
				for (const prefix of Config.forcedprefixes[type].map(toID)) {
					convertedPrefixes.push({type, prefix, expireAt: Date.now() + PREFIX_DURATION});
					this.timeouts.set(prefix, setTimeout(() => {
						this.removePrefix(prefix, type );
					}, PREFIX_DURATION));
				}
			}
			Config.forcedprefixes = convertedPrefixes;
		}
		if (configJustLoaded) {
			for (const entry of Config.forcedprefixes) {
				entry.prefix = toID(entry.prefix);
				if (!this.timeouts.get(entry.prefix)) {
					const expireTime = entry.expireAt - Date.now();
					if (expireTime < 0) {
						this.removePrefix(entry.prefix, entry.type );
						continue;
					}
					this.timeouts.set(entry.prefix, setTimeout(() => {
						this.removePrefix(entry.prefix, entry.type );
					}, expireTime));
				}
			}
		}

		let data;
		try {
			data = JSON.parse(_lib.FS.call(void 0, PREFIXES_FILE).readSync());
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
			return;
		}
		if (data.length) {
			for (const entry of data) {
				if (Config.forcedprefixes.includes(entry)) continue;
				Config.forcedprefixes.push(entry);
				if (!this.timeouts.get(entry.prefix)) {
					const expireTime = entry.expireAt - Date.now();
					if (expireTime < 0) {
						this.removePrefix(entry.prefix, entry.type );
						continue;
					}
					this.timeouts.set(entry.prefix, setTimeout(() => {
						this.removePrefix(entry.prefix, entry.type );
					}, expireTime));
				}
			}
		}
	}

	addPrefix(prefix, type) {
		if (!Config.forcedprefixes) Config.forcedprefixes = [];
		const entry = Config.forcedprefixes.find((x) => x.prefix === prefix && x.type === type);
		if (entry) {
			throw new Chat.ErrorMessage(`Username prefix '${prefix}' is already configured to force ${type}.`);
		}

		Config.forcedprefixes.push({type, prefix, expireAt: Date.now() + PREFIX_DURATION});
		this.timeouts.set(prefix, setTimeout(() => {
			this.removePrefix(prefix, type);
		}, PREFIX_DURATION));
		this.save();
	}

	removePrefix(prefix, type) {
		const entry = Config.forcedprefixes.findIndex((x) => x.prefix === prefix && x.type === type);
		if (entry < 0) {
			throw new Chat.ErrorMessage(`Username prefix '${prefix}' is not configured to force ${type}!`);
		}

		Config.forcedprefixes.splice(entry, 1);
		const timeoutEntry = this.timeouts.get(prefix);
		if (timeoutEntry) {
			clearTimeout(timeoutEntry);
			this.timeouts.delete(prefix);
		}
		this.save();
	}

	validateType(type) {
		if (type !== 'privacy' && type !== 'modchat') {
			throw new Chat.ErrorMessage(`'${type}' is not a valid type of forced prefix. Valid types are 'privacy' and 'modchat'.`);
		}
		return type;
	}
} exports.PrefixManager = PrefixManager;

 const prefixManager = new PrefixManager(); exports.prefixManager = prefixManager;

 const commands = {
	forceprefix: 'usernameprefix',
	forcedprefix: 'usernameprefix',
	forcedprefixes: 'usernameprefix',
	usernameprefixes: 'usernameprefix',
	usernameprefix: {
		help: '',
		''() {
			this.parse(`/help forcedprefix`);
		},

		delete: 'add',
		remove: 'add',
		add(target, room, user, connection, cmd) {
			this.checkCan('rangeban');

			const isAdding = cmd.includes('add');

			const [prefix, type] = target.split(',').map(toID);
			if (!prefix || !type) return this.parse(`/help usernameprefix`);
			if (prefix.length > 18) {
				throw new Chat.ErrorMessage(`Specified prefix '${prefix}' is longer than the maximum user ID length.`);
			}

			if (isAdding) {
				exports.prefixManager.addPrefix(prefix, exports.prefixManager.validateType(type));
			} else {
				exports.prefixManager.removePrefix(prefix, exports.prefixManager.validateType(type));
			}

			this.globalModlog(`FORCEDPREFIX ${isAdding ? 'ADD' : 'REMOVE'}`, null, `'${prefix}' ${isAdding ? 'to' : 'from'} ${type}`);
			this.addGlobalModAction(`${user.name} set the username prefix ${prefix} to${isAdding ? '' : ' no longer'} disable ${type}.`);
		},

		view(target) {
			this.checkCan('rangeban');

			const types = target ? [exports.prefixManager.validateType(toID(target))] : ['privacy', 'modchat'];

			const entries = Config.forcedprefixes.filter((x) => types.includes(x.type));

			return this.sendReplyBox(types.map(type => {
				const prefixes = entries.filter((x) => x.type === type).map((x) => x.prefix);
				const info = prefixes.length ?
					`<code>${prefixes.join('</code>, <code>')}</code>` : `none`;
				return `Username prefixes that disable <strong>${type}</strong>: ${info}.`;
			}).join(`<br />`));
		},
	},
	usernameprefixhelp() {
		return this.sendReplyBox(
			`<code>/usernameprefix add [prefix], [type]</code>: Sets the username prefix [prefix] to disable privacy or modchat on battles where at least one player has the prefix.<br />` +
			`<code>/usernameprefix remove [prefix], [type]</code>: Removes a prefix configuration.<br />` +
			`<code>/usernameprefix view [optional type]</code>: Displays the currently configured username prefixes.<br />` +
			`Valid types are <code>privacy</code> (which forces battles to take place in public rooms) and <code>modchat</code> (which prevents players from setting moderated chat).<br />` +
			`Requires: &`
		);
	},
}; exports.commands = commands;

 //# sourceMappingURL=sourceMaps/username-prefixes.js.map