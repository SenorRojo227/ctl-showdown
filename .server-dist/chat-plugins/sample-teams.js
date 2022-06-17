"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * A sample teams plugin
 *
 * @author Kris
 */

var _lib = require('../../.lib-dist');

const SAMPLE_TEAMS = 'config/chat-plugins/sample-teams.json';












 const teamData = (() => {
	try {
		return JSON.parse(_lib.FS.call(void 0, SAMPLE_TEAMS).readIfExistsSync());
	} catch (e) {
		return {
			whitelist: {},
			teams: {},
		};
	}
})(); exports.teamData = teamData;

function save() {
	_lib.FS.call(void 0, SAMPLE_TEAMS).writeUpdate(() => JSON.stringify(exports.teamData));
}

for (const formatid in exports.teamData.teams) {
	if (!exports.teamData.teams[formatid].uncategorized) exports.teamData.teams[formatid].uncategorized = {};
}
save();

 const SampleTeams = new class SampleTeams {
	 isRoomStaff(user, roomids) {
		let matched = false;
		if (!_optionalChain([roomids, 'optionalAccess', _ => _.length])) return false;
		for (const roomid of roomids) {
			const room = Rooms.search(roomid);
			// Malformed entry from botched room rename
			if (!room) continue;
			matched = room.auth.isStaff(user.id);
			if (matched) break;
		}
		return matched;
	}

	isDevMod(user) {
		return !!_optionalChain([Rooms, 'access', _2 => _2.get, 'call', _3 => _3('development'), 'optionalAccess', _4 => _4.auth, 'access', _5 => _5.atLeast, 'call', _6 => _6(user, '@')]);
	}

	checkPermissions(user, roomids) {
		// Give Development room mods access to help fix crashes
		return this.isRoomStaff(user, roomids) || user.can('bypassall') || this.isDevMod(user);
	}

	whitelistedRooms(formatid, names = false) {
		formatid = this.sanitizeFormat(formatid);
		if (!_optionalChain([exports.teamData, 'access', _7 => _7.whitelist, 'access', _8 => _8[formatid], 'optionalAccess', _9 => _9.length])) return null;
		return _lib.Utils.sortBy(exports.teamData.whitelist[formatid], (x) => {
			if (!names) return x;
			const room = Rooms.search(x);
			if (!room) return x;
			return room.title;
		});
	}

	whitelistRooms(formatids, roomids) {
		for (const unsanitizedFormatid of formatids) {
			const formatid = this.sanitizeFormat(unsanitizedFormatid);
			if (!exports.teamData.whitelist[formatid]) exports.teamData.whitelist[formatid] = [];
			for (const roomid of roomids) {
				const targetRoom = Rooms.search(roomid);
				if (!_optionalChain([targetRoom, 'optionalAccess', _10 => _10.persist])) {
					throw new Chat.ErrorMessage(`Room ${roomid} not found. Check spelling?`);
				}
				if (exports.teamData.whitelist[formatid].includes(targetRoom.roomid)) {
					throw new Chat.ErrorMessage(`Room ${targetRoom.title} is already added.`);
				}
				exports.teamData.whitelist[formatid].push(targetRoom.roomid);
				save();
			}
		}
	}

	unwhitelistRoom(formatid, roomid) {
		// Don't sanitize with Dex.formats.get in case format was removed
		formatid = toID(formatid);
		const targetRoom = Rooms.search(roomid);
		if (!_optionalChain([targetRoom, 'optionalAccess', _11 => _11.persist])) throw new Chat.ErrorMessage(`Room ${roomid} not found. Check spelling?`);
		if (!_optionalChain([exports.teamData, 'access', _12 => _12.whitelist, 'access', _13 => _13[formatid], 'optionalAccess', _14 => _14.length])) throw new Chat.ErrorMessage(`No rooms are whitelisted for ${formatid}.`);
		if (!exports.teamData.whitelist[formatid].includes(targetRoom.roomid)) {
			throw new Chat.ErrorMessage(`Room ${targetRoom.title} isn't whitelisted.`);
		}
		const index = exports.teamData.whitelist[formatid].indexOf(targetRoom.roomid);
		exports.teamData.whitelist[formatid].splice(index, 1);
		if (!exports.teamData.whitelist[formatid].length) delete exports.teamData.whitelist[formatid];
		save();
	}

	sanitizeFormat(formatid) {
		const format = Dex.formats.get(formatid);
		if (!format.exists) {
			throw new Chat.ErrorMessage(`Format "${formatid.trim()}" not found. Check spelling?`);
		}
		if (format.team) {
			throw new Chat.ErrorMessage(`Formats with computer-generated teams can't have team storage.`);
		}
		return format.id;
	}

	initializeFormat(formatid) {
		if (!exports.teamData.teams[formatid]) {
			exports.teamData.teams[formatid] = {uncategorized: {}};
			save();
		}
	}

	addCategory(user, formatid, category) {
		if (!this.checkPermissions(user, exports.teamData.whitelist[formatid])) {
			throw new Chat.ErrorMessage(`Access denied. You need to be staff in ${Chat.toListString(exports.teamData.whitelist[formatid], "or")} to add teams for ${formatid}.`);
		}
		formatid = this.sanitizeFormat(formatid);
		category = category.trim();
		this.initializeFormat(formatid);
		if (this.findCategory(formatid, category)) {
			throw new Chat.ErrorMessage(`The category named ${category} already exists.`);
		}
		exports.teamData.teams[formatid][category] = {};
		save();
	}

	removeCategory(user, formatid, category) {
		if (!this.checkPermissions(user, exports.teamData.whitelist[formatid])) {
			throw new Chat.ErrorMessage(`Access denied. You need to be staff in ${Chat.toListString(exports.teamData.whitelist[formatid], "or")} to add teams for ${formatid}.`);
		}
		formatid = this.sanitizeFormat(formatid);
		const categoryName = this.findCategory(formatid, category);
		if (!categoryName) {
			throw new Chat.ErrorMessage(`There's no category named "${category.trim()}" for the format ${formatid}.`);
		}
		delete exports.teamData.teams[formatid][categoryName];
		save();
	}

	/**
	 * @param user
	 * @param formatid
	 * @param teamName
	 * @param team - Can be a team in the packed, JSON, or exported format
	 * @param category - Category the team will go in, defaults to uncategorized
	 */
	addTeam(user, formatid, teamName, team, category = "uncategorized") {
		if (!this.checkPermissions(user, exports.teamData.whitelist[formatid])) {
			let rankNeeded = `a global administrator`;
			if (_optionalChain([exports.teamData, 'access', _15 => _15.whitelist, 'access', _16 => _16[formatid], 'optionalAccess', _17 => _17.length])) {
				rankNeeded = `staff in ${Chat.toListString(exports.teamData.whitelist[formatid], "or")}`;
			}
			throw new Chat.ErrorMessage(`Access denied. You need to be ${rankNeeded} to add teams for ${formatid}`);
		}
		teamName = teamName.trim();
		category = category.trim();
		formatid = this.sanitizeFormat(formatid);
		this.initializeFormat(formatid);
		if (this.findTeamName(formatid, category, teamName)) {
			throw new Chat.ErrorMessage(`There is already a team for ${formatid} with the name ${teamName} in the ${category} category.`);
		}
		if (!exports.teamData.teams[formatid][category]) this.addCategory(user, formatid, category);
		exports.teamData.teams[formatid][category][teamName] = Teams.pack(Teams.import(team.trim()));
		save();
		return exports.teamData.teams[formatid][category][teamName];
	}

	removeTeam(user, formatid, teamid, category) {
		formatid = formatid.trim();
		category = category.trim();
		// Don't sanitize formatid here in case a team was added for a temporary format that got removed
		if (!this.checkPermissions(user, exports.teamData.whitelist[formatid])) {
			let required = `an administrator`;
			if (exports.teamData.whitelist[formatid]) {
				required = `staff in ${Chat.toListString(exports.teamData.whitelist[formatid], "or")}`;
			}
			throw new Chat.ErrorMessage(`Access denied. You need to be ${required} to add teams for ${formatid}`);
		}
		const categoryName = this.findCategory(formatid, category);
		if (!categoryName) {
			throw new Chat.ErrorMessage(`There are no teams for ${formatid} under the category ${category.trim()}. Check spelling?`);
		}
		const teamName = this.findTeamName(formatid, category, teamid);
		if (!teamName) {
			throw new Chat.ErrorMessage(`There is no team for ${formatid} with the name of "${teamid}". Check spelling?`);
		}
		const oldTeam = exports.teamData.teams[formatid][categoryName][teamName];
		delete exports.teamData.teams[formatid][categoryName][teamName];
		if (!Object.keys(exports.teamData.teams[formatid][categoryName]).length) delete exports.teamData.teams[formatid][categoryName];
		if (!Object.keys(exports.teamData.teams[formatid]).filter(x => x !== 'uncategorized').length) delete exports.teamData.teams[formatid];
		save();
		return oldTeam;
	}

	formatTeam(teamName, teamStr, broadcasting = false) {
		const team = Teams.unpack(teamStr);
		if (!team) return `Team is not correctly formatted. PM room staff to fix the formatting.`;
		let buf = ``;
		if (!broadcasting) {
			buf += `<center><strong style="letter-spacing:1.2pt">${team.map(x => `<psicon pokemon="${x.species}" />`).join('')}`;
			buf += `<br />${_lib.Utils.escapeHTML(teamName.toUpperCase())}</strong></center>`;
			buf += Chat.getReadmoreCodeBlock(Teams.export(team).trim());
		} else {
			buf += `<details><summary>${team.map(x => `<psicon pokemon="${x.species}" />`).join('')} &ndash; ${_lib.Utils.escapeHTML(teamName)}</summary>`;
			buf += `<code style="white-space: pre-wrap; display: table; tab-size: 3">${Teams.export(team).trim().replace(/\n/g, '<br />')}</code></details>`;
		}
		return buf;
	}

	modlog(context, formatid, action, note, log) {
		formatid = this.sanitizeFormat(formatid);
		const whitelistedRooms = this.whitelistedRooms(formatid);
		if (_optionalChain([whitelistedRooms, 'optionalAccess', _18 => _18.length])) {
			for (const roomid of whitelistedRooms) {
				const room = Rooms.get(roomid);
				if (!room) continue;
				context.room = room;
				context.modlog(action, null, `${formatid}: ${note}`);
				context.privateModAction(log);
			}
		} else {
			context.room = Rooms.get('staff') || null;
			context.globalModlog(action, null, `${formatid}: ${note}`);
			context.privateGlobalModAction(log);
		}
	}

	/**
	 * Returns the category name of the provided category ID if there is one.
	 */
	findCategory(formatid, categoryid) {
		formatid = toID(formatid);
		categoryid = toID(categoryid);
		let match = null;
		for (const categoryName in exports.teamData.teams[formatid] || {}) {
			if (toID(categoryName) === categoryid) {
				match = categoryName;
				break;
			}
		}
		return match;
	}

	findTeamName(formatid, categoryid, teamid) {
		const categoryName = this.findCategory(formatid, categoryid);
		if (!categoryName) return null;
		let match = null;
		for (const teamName in exports.teamData.teams[formatid][categoryName] || {}) {
			if (toID(teamName) === teamid) {
				match = teamName;
				break;
			}
		}
		return match;
	}

	getFormatName(formatid) {
		return Dex.formats.get(formatid).exists ? Dex.formats.get(formatid).name : formatid;
	}

	destroy() {
		for (const formatid in exports.teamData.whitelist) {
			for (const [i, roomid] of exports.teamData.whitelist[formatid].entries()) {
				const room = Rooms.search(roomid);
				if (room) continue;
				exports.teamData.whitelist[formatid].splice(i, 1);
				if (!exports.teamData.whitelist[formatid].length) delete exports.teamData.whitelist[formatid];
				save();
			}
		}
	}
}; exports.SampleTeams = SampleTeams;

 const destroy = exports.SampleTeams.destroy; exports.destroy = destroy;

 const handlers = {
	onRenameRoom(oldID, newID) {
		for (const formatid in exports.teamData.whitelist) {
			if (!_optionalChain([exports.SampleTeams, 'access', _19 => _19.whitelistedRooms, 'call', _20 => _20(formatid), 'optionalAccess', _21 => _21.includes, 'call', _22 => _22(oldID)])) continue;
			exports.SampleTeams.unwhitelistRoom(formatid, oldID);
			exports.SampleTeams.whitelistRooms([formatid], [newID]);
		}
	},
}; exports.handlers = handlers;

 const commands = {
	sampleteams: {
		''(target, room, user) {
			this.runBroadcast();
			let [formatid, category] = target.split(',');
			if (!this.broadcasting) {
				if (!formatid) return this.parse(`/j view-sampleteams-view`);
				formatid = exports.SampleTeams.sanitizeFormat(formatid);
				if (!category) return this.parse(`/j view-sampleteams-view-${formatid}`);
				const categoryName = exports.SampleTeams.findCategory(formatid, category);
				return this.parse(`/j view-sampleteams-view-${formatid}${categoryName ? '-' + toID(categoryName) : ''}`);
			}
			if (!formatid) return this.parse(`/help sampleteams`);
			formatid = exports.SampleTeams.sanitizeFormat(formatid);
			if (!exports.teamData.teams[formatid]) {
				throw new Chat.ErrorMessage(`No teams for ${exports.SampleTeams.getFormatName(formatid)} found. Check spelling?`);
			}
			let buf = ``;
			if (!category) {
				for (const categoryName in exports.teamData.teams[formatid]) {
					if (!Object.keys(exports.teamData.teams[formatid][categoryName]).length) continue;
					if (buf) buf += `<hr />`;
					buf += `<details${Object.keys(exports.teamData.teams[formatid]).length < 2 ? ` open` : ``}><summary><strong style="letter-spacing:1.2pt">${categoryName.toUpperCase()}</strong></summary>`;
					for (const [i, teamName] of Object.keys(exports.teamData.teams[formatid][categoryName]).entries()) {
						if (i) buf += `<hr />`;
						buf += exports.SampleTeams.formatTeam(teamName, exports.teamData.teams[formatid][categoryName][teamName], true);
					}
					buf += `</details>`;
				}
				if (!buf) {
					throw new Chat.ErrorMessage(`No teams for ${exports.SampleTeams.getFormatName(formatid)} found. Check spelling?`);
				} else {
					buf = `<center><h3>Sample Teams for ${exports.SampleTeams.getFormatName(formatid)}</h3></center><hr />${buf}`;
				}
			} else {
				const categoryName = exports.SampleTeams.findCategory(formatid, category);
				if (!categoryName) {
					throw new Chat.ErrorMessage(`No teams for ${exports.SampleTeams.getFormatName(formatid)} in the ${category} category found. Check spelling?`);
				}
				for (const teamName in exports.teamData.teams[formatid][categoryName]) {
					buf += exports.SampleTeams.formatTeam(teamName, exports.teamData.teams[formatid][categoryName][teamName], true);
				}
			}
			this.sendReplyBox(buf);
		},
		addcategory(target, room, user) {
			let [formatid, categoryName] = target.split(',');
			if (!(formatid && categoryName)) return this.parse(`/help sampleteams`);
			if (!categoryName.trim()) categoryName = "uncategorized";
			exports.SampleTeams.addCategory(user, formatid, categoryName.trim());
			exports.SampleTeams.modlog(
				this, formatid, 'ADDTEAMCATEGORY', categoryName.trim(),
				`${user.name} added ${categoryName.trim()} as a category for ${formatid}.`
			);
			this.sendReply(`Added ${categoryName.trim()} as a category for ${formatid}.`);
		},
		removecategory(target, room, user) {
			const [formatid, categoryName] = target.split(',');
			if (!(formatid && categoryName)) return this.parse(`/help sampleteams`);
			if (toID(categoryName) === 'uncategorized') {
				throw new Chat.ErrorMessage(`The uncategorized category cannot be removed.`);
			}
			exports.SampleTeams.removeCategory(user, formatid, categoryName);
			exports.SampleTeams.modlog(
				this, formatid, 'REMOVETEAMCATEGORY', categoryName.trim(),
				`${user.name} removed ${categoryName.trim()} as a category for ${formatid}.`
			);
			this.sendReply(`Removed ${categoryName.trim()} as a category for ${formatid}.`);
		},
		add(target, room, user) {
			const [formatid, category, teamName, team] = target.split(',');
			if (!(formatid && _optionalChain([category, 'optionalAccess', _23 => _23.trim, 'call', _24 => _24()]) && teamName && team)) return this.parse('/j view-sampleteams-add');
			const packedTeam = exports.SampleTeams.addTeam(user, formatid, teamName, team, category);
			exports.SampleTeams.modlog(
				this, formatid, 'ADDTEAM', `${category}: ${teamName}: ${packedTeam}`,
				`${user.name} added a team for ${formatid}${category ? ` in the ${category} category` : ''}.`
			);
			this.sendReply(`Added a team for ${formatid} ${category ? ` in the ${category} category` : ''}.`);
		},
		remove(target, room, user) {
			const [formatid, category, teamName] = target.split(',').map(x => x.trim());
			if (!(formatid && category && teamName)) return this.parse(`/help sampleteams`);
			const team = exports.SampleTeams.removeTeam(user, formatid, toID(teamName), category);
			exports.SampleTeams.modlog(
				this, formatid, 'REMOVETEAM', `${category}: ${teamName}: ${team}`,
				`${user.name} removed a team from ${formatid}${category ? ` in the ${category} category` : ''}.`
			);
			this.sendReply(`Removed a team from ${formatid} ${category ? ` in the ${category} category` : ''}.`);
		},
		whitelist: {
			add(target, room, user) {
				// Allow development roommods to whitelist to help debug
				if (!exports.SampleTeams.isDevMod(user)) {
					this.checkCan('bypassall');
				}
				const [formatids, roomids] = target.split('|').map(x => x.split(','));
				if (!(_optionalChain([formatids, 'optionalAccess', _25 => _25.length]) && _optionalChain([roomids, 'optionalAccess', _26 => _26.length]))) return this.parse(`/help sampleteams`);
				exports.SampleTeams.whitelistRooms(formatids, roomids);
				this.privateGlobalModAction(`${user.name} whitelisted ${Chat.toListString(roomids.map(x => Rooms.search(x).title))} to handle sample teams for ${Chat.toListString(formatids)}.`);
				this.globalModlog(`SAMPLETEAMS WHITELIST`, null, roomids.join(', '));
				this.sendReply(`Whitelisted ${Chat.toListString(roomids)} to handle sample teams for ${Chat.toListString(formatids)}.`);
			},
			remove(target, room, user) {
				// Allow development roommods to whitelist to help debug
				if (!exports.SampleTeams.isDevMod(user)) {
					this.checkCan('bypassall');
				}
				const [formatid, roomid] = target.split(',');
				if (!(formatid && roomid)) return this.parse(`/help sampleteams`);
				exports.SampleTeams.unwhitelistRoom(formatid, roomid);
				this.refreshPage('sampleteams-whitelist');
			},
			'': 'view',
			view(target, room, user) {
				// Allow development roommods to whitelist to help debug
				if (!exports.SampleTeams.isDevMod(user)) {
					this.checkCan('bypassall');
				}
				this.parse(`/j view-sampleteams-whitelist`);
			},
		},
	},
	sampleteamshelp: [
		`/sampleteams [format] - Lists the sample teams for [format], if there are any.`,
		`/sampleteams addcategory/removecategory [format], [category] - Adds/removes categories for [format].`,
		`/sampleteams add - Pulls up the interface to add sample teams. Requires: Room staff in dedicated tier room, &`,
		`/sampleteams remove [format], [category], [team name] - Removes a sample team for [format] in [category].`,
		`/sampleteams whitelist add [formatid], [formatid] | [roomid], [roomid], ... - Whitelists room staff for the provided roomids to add sample teams. Requires: &`,
		`/sampleteams whitelist remove [formatid], [roomid] - Unwhitelists room staff for the provided room to add sample teams. Requires: &`,
	],
}; exports.commands = commands;

function formatFakeButton(url, text) {
	return `<a class="button" style="text-decoration:inherit" target="replace" href="${url}">${text}</a>`;
}

 const pages = {
	sampleteams: {
		whitelist(query, user, connection) {
			this.title = `Sample Teams Whitelist`;
			if (!(exports.SampleTeams.isDevMod(user) || user.can('bypassall'))) {
				return `<div class="pad"><h2>Access denied.</h2></div>`;
			}
			const staffRoomAccess = _optionalChain([Rooms, 'access', _27 => _27.get, 'call', _28 => _28('staff'), 'optionalAccess', _29 => _29.checkModjoin, 'call', _30 => _30(user)]);
			let buf = `<div class="pad"><button style="float:right" class="button" name="send" value="/j view-sampleteams-whitelist${query.length ? `-${query.join('-')}` : ''}"><i class="fa fa-refresh"></i> Refresh</button><h2>Sample Teams Rooms Whitelist</h2>`;
			if ((!exports.teamData.whitelist || !Object.keys(exports.teamData.whitelist).length) && !query.length) {
				buf += `<p>No rooms are whitelisted for any formats.</p>`;
			}
			if (query[0] === 'add') {
				buf += `<form data-submitsend="${staffRoomAccess ? `/msgroom staff,` : exports.SampleTeams.isDevMod(user) ? `/msgroom development,` : ``}/sampleteams whitelist add {formats}|{roomids}">`;
				buf += `<label>Enter a list formats, separated by comma: <input name="formats" /></label><br /><br />`;
				buf += `<label>Enter a list of rooms, separated by comma: <input name="roomids" /></label><br />`;
				buf += `<br /><button class="button" type="submit">Whitelist rooms</button></form>`;
				buf += `<br />${formatFakeButton("view-sampleteams-whitelist", "Return to list")}`;
			} else {
				buf += `<dl>`;
				for (const formatid of Object.keys(exports.teamData.whitelist).sort().reverse()) {
					if (!_optionalChain([exports.teamData, 'access', _31 => _31.whitelist, 'access', _32 => _32[formatid], 'optionalAccess', _33 => _33.length])) continue;
					buf += `<dt>${exports.SampleTeams.getFormatName(formatid)}</dt>`;
					for (const roomid of exports.teamData.whitelist[formatid]) {
						buf += `<dd>${_optionalChain([Rooms, 'access', _34 => _34.get, 'call', _35 => _35(roomid), 'optionalAccess', _36 => _36.title]) || roomid}`;
						buf += ` <button class="button" name="send" value="/sampleteams whitelist remove ${formatid},${roomid}">Remove</button></dd>`;
					}
				}
				buf += `</dl>`;
			}
			buf += `${query.length ? '' : formatFakeButton("view-sampleteams-whitelist-add", "Whitelist room")}</div>`;
			return buf;
		},
		view(query, user, connection) {
			this.title = `Sample Teams`;
			let buf = `<div class="pad">`;
			if (query.slice(0, query.length - 1).join('-')) {
				buf += `${formatFakeButton(`view-sampleteams-view-${query.slice(0, query.length - 1).join('-')}`, "&laquo; Back")}`;
			} else {
				buf += `<button class="button disabled" disabled>&laquo; Back</button>`;
			}
			buf += `<button style="float:right" class="button" name="send" value="/j view-sampleteams-view${query.join('-') ? `-${query.join('-')}` : ``}"><i class="fa fa-refresh"></i> Refresh</button>`;
			buf += `<center><h2>Sample Teams</h2></center><hr />`;
			const q0Teams = exports.teamData.teams[query[0]];
			const q0TeamKeys = q0Teams ? Object.keys(q0Teams) : [];
			if (!query[0]) {
				const formats = Object.keys(exports.teamData.teams);
				if (!formats.length) return `${buf}<p>No teams found.</p></div>`;
				buf += `<h3>Pick a format</h3><ul>`;
				for (const formatid of formats) {
					if (!formatid) continue;
					buf += `<li>${formatFakeButton(`view-sampleteams-view-${formatid}`, `${exports.SampleTeams.getFormatName(formatid)}`)}</button></li>`;
				}
				buf += `</ul>`;
			} else if (!q0Teams || !q0TeamKeys.length ||
				(!Object.keys(q0Teams.uncategorized).length && !q0TeamKeys.filter(x => x !== 'uncategorized').length)) {
				const name = Dex.formats.get(query[0]).exists ? Dex.formats.get(query[0]).name : query[0];
				return `${buf}<p>No teams for ${name} were found.</p></div>`;
			} else if (!query[1] || (!exports.SampleTeams.findCategory(query[0], query[1]) && query[1] !== 'allteams')) {
				buf += `<h3>Pick a category</h3><ul>`;
				for (const category of Object.keys(exports.teamData.teams[query[0]])) {
					buf += `<li><a class="button" style="text-decoration:inherit;color:inherit" target="replace" href="view-sampleteams-view-${query[0]}-${toID(category)}">${category}</button></li>`;
				}
				buf += `<li><a class="button" style="text-decoration:inherit;color:inherit" target="replace" href="view-sampleteams-view-${query[0]}-allteams">ALL</button></li></ul>`;
			} else if (query[1] === 'allteams') {
				buf += `<h3>All teams for ${exports.SampleTeams.getFormatName(query[0])}</h3>`;
				for (const categoryName in exports.teamData.teams[query[0]]) {
					const category = exports.teamData.teams[query[0]][categoryName];
					if (!Object.keys(category).length) continue;
					buf += `<details><summary><h4 style="display:inline">${categoryName}</h4></summary>`;
					for (const teamName in category) {
						const team = category[teamName];
						if (exports.SampleTeams.checkPermissions(user, exports.teamData.whitelist[query[0]] || [])) {
							buf += `<button class="button" style="float:right" name="send" value="/sampleteams remove ${query[0]},${categoryName},${teamName}">Delete team</button>`;
						}
						buf += exports.SampleTeams.formatTeam(teamName, team);
					}
					buf += `</details>`;
					const index = Object.keys(exports.teamData.teams[query[0]]).indexOf(categoryName);
					if (index !== Object.keys(exports.teamData.teams[query[0]]).length - 1) buf += `<hr />`;
				}
			} else if (exports.SampleTeams.findCategory(query[0], query[1])) {
				const categoryName = exports.SampleTeams.findCategory(query[0], query[1]);
				buf += `<h3>Sample teams for ${exports.SampleTeams.getFormatName(query[0])} in the ${categoryName} category</h3>`;
				for (const teamName in exports.teamData.teams[query[0]][categoryName]) {
					const team = exports.teamData.teams[query[0]][categoryName][teamName];
					buf += exports.SampleTeams.formatTeam(teamName, team);
				}
			}
			buf += `</div>`;
			return buf;
		},
		add(query, user, connection) {
			this.title = `Sample Teams`;
			const trimFormatName = (name) => (name.includes('(') ? name.slice(0, name.indexOf('(')) : name).trim();
			const formatsSet = new Set(Dex.formats.all().map(format => trimFormatName(format.name)));
			const formatsArr = Array.from(formatsSet);
			const formats = formatsArr.map(formatName => Dex.formats.get(formatName))
				.filter(format => (
					!format.name.includes('Custom') && format.effectType === 'Format' &&
					!format.team && exports.SampleTeams.checkPermissions(user, exports.SampleTeams.whitelistedRooms(format.id) || [])
				));
			if (!formats.length) return `<div class="pad"><h2>Access denied.</h2></div>`;
			let buf = `<div class="pad">`;
			if (query.slice(0, query.length - 1).join('-')) {
				buf += `${formatFakeButton(`view-sampleteams-add-${query.slice(0, query.length - 1).join('-')}`, "&laquo; Back")}`;
			} else {
				buf += `<button class="button disabled" disabled>&laquo; Back</button>`;
			}
			let buttonTitle = 'Refresh';
			if (query[2] === 'submit') buttonTitle = 'Add another team';
			buf += `<button style="float:right" class="button" name="send" value="/j view-sampleteams-add${query.join('-') ? `-${query.join('-')}` : ``}"><i class="fa fa-refresh"></i> ${buttonTitle}</button>`;
			buf += `<div class="pad"><h2>Add a sample team</h2>`;
			if (!query[0] || !Dex.formats.get(query[0]).exists) {
				buf += `<h3>Pick a format</h3><ul>`;
				for (const format of formats) {
					buf += `<li>${formatFakeButton(`view-sampleteams-add-${format.id}`, format.name)}</button></li>`;
				}
				buf += `</ul>`;
			} else if (!query[1] || !exports.SampleTeams.findCategory(query[0], query[1]) || query[1] === 'addnewcategory') {
				const name = exports.SampleTeams.getFormatName(query[0]);
				if (query[1] === 'addnewcategory') {
					buf += `<h3>Add a category for ${name}</h3>`;
					buf += `<form data-submitsend="/sampleteams addcategory ${query[0]},{categoryname}">`;
					buf += `<input name="categoryname" />`;
					buf += `<button class="button" type="submit">Add category</button></form>`;
				} else {
					buf += `<h3>Pick a category for ${name}</h3><ul>`;
					for (const category of Object.keys(exports.teamData.teams[query[0]] || {}) || []) {
						buf += `<li style="padding-top:5px">${formatFakeButton(`view-sampleteams-add-${query[0]}-${toID(category)}-submit`, category)}</li>`;
					}
					buf += `<li style="padding-top:5px">${formatFakeButton(`view-sampleteams-add-${query[0]}-addnewcategory`, `<strong>Add new category</strong>`)}</li></ul>`;
				}
			}
			const categoryName = exports.SampleTeams.findCategory(query[0], query[1]);
			if (categoryName) {
				buf += `<form data-submitsend="/sampleteams add ${query[0]}, ${categoryName}, {teamName}, {team}">`;
				buf += `<h3>Enter a team name</h3><input name="teamName" />`;
				buf += `<h3>Enter team importable</h3><textarea style="width:100%;height:400px" name="team"></textarea><br />`;
				buf += `<button class="button" type="submit">Add sample team</button></form>`;
			}
			buf += `</div>`;
			return buf;
		},
	},
}; exports.pages = pages;

Chat.multiLinePattern.register(`/sampleteams add `);

 //# sourceMappingURL=sourceMaps/sample-teams.js.map