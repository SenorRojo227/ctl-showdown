"use strict";const _jsxFileName = "..\\..\\server\\chat-plugins\\usersearch.tsx";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _lib = require('../../.lib-dist');

 const nameList = new Set(JSON.parse(
	_lib.FS.call(void 0, 'config/chat-plugins/usersearch.json').readIfExistsSync() || "[]"
)); exports.nameList = nameList;

const ONLINE_SYMBOL = ` \u25C9 `;
const OFFLINE_SYMBOL = ` \u25CC `;

class PunishmentHTML extends Chat.JSX.Component {
	render() {
		const {userid, target} = {...this.props};
		const buf = [];
		for (const cmdName of ['Forcerename', 'Namelock', 'Weeknamelock']) {
			// We have to use dangerouslySetInnerHTML here because otherwise the `value`
			// property of the button tag is auto escaped, making &#10; into &amp;#10;
			buf.push(React.createElement('span', { dangerouslySetInnerHTML: 
				{
					__html: `<button class="button" name="send" value="/msgroom staff,/${toID(cmdName)} ${userid}` +
					`&#10;/uspage ${target}">${cmdName}</button>`,
				}
			, __self: this, __source: {fileName: _jsxFileName, lineNumber: 17}} ));
		}
		return buf;
	}
}

class SearchUsernames extends Chat.JSX.Component {
	render() {
		const {target, page} = {...this.props};
		const results = {
			offline: [],
			online: [],
		};
		for (const curUser of Users.users.values()) {
			if (!curUser.id.includes(target) || curUser.id.startsWith('guest')) continue;
			if (Punishments.isGlobalBanned(curUser)) continue;
			if (curUser.connected) {
				results.online.push(`${!page ? ONLINE_SYMBOL : ''} ${curUser.name}`);
			} else {
				results.offline.push(`${!page ? OFFLINE_SYMBOL : ''} ${curUser.name}`);
			}
		}
		for (const k in results) {
			_lib.Utils.sortBy(results[k ], result => toID(result));
		}
		if (!page) {
			return React.createElement(React.Fragment, null, "Users with a name matching '"
     , target, "':", React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 49}} )
, !results.offline.length && !results.online.length ?
					React.createElement(React.Fragment, null, "No users found."  ) : React.createElement(React.Fragment, null
, results.online.join('; ')
, !!results.offline.length &&
							React.createElement(React.Fragment, null, !!results.online.length && React.createElement(React.Fragment, null, React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 54}} ), React.createElement('br', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 54}} )), results.offline.join('; '))
)
				
);
		}
		return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 59}}
, React.createElement('h2', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 60}}, "Usernames containing \""  , target, "\"")
, !results.online.length && !results.offline.length ?
				React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 62}}, "No results found."  ) :
				React.createElement(React.Fragment, null, !!results.online.length && React.createElement('div', { class: "ladder pad" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 63}}
, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 64}}, "Online users" )
, React.createElement('table', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 65}}
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 66}}
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 67}}, "Username")
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 68}}, "Punish")
)
, (() => {
							const online = [];
							for (const username of results.online) {
								online.push(React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 73}}
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 74}}, React.createElement('username', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 74}}, username))
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 75}}, React.createElement(PunishmentHTML, { userid: toID(username), target: target, __self: this, __source: {fileName: _jsxFileName, lineNumber: 75}} ))
));
							}
							return online;
						})()
)
)
, !!(results.online.length && results.offline.length) && React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 82}} )
, !!results.offline.length && React.createElement('div', { class: "ladder pad" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 83}}
, React.createElement('h3', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 84}}, "Offline users" )
, React.createElement('table', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 85}}
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 86}}
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 87}}, "Username")
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 88}}, "Punish")
)
, (() => {
							const offline = [];
							for (const username of results.offline) {
								offline.push(React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 93}}
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 94}}, React.createElement('username', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 94}}, username))
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 95}}, React.createElement(PunishmentHTML, { userid: toID(username), target: target, __self: this, __source: {fileName: _jsxFileName, lineNumber: 95}} ))
));
							}
							return offline;
						})()
)
))
			
);
	}
}

function saveNames() {
	_lib.FS.call(void 0, 'config/chat-plugins/usersearch.json').writeUpdate(() => JSON.stringify([...exports.nameList]));
}

 const commands = {
	us: 'usersearch',
	uspage: 'usersearch',
	usersearchpage: 'usersearch',
	usersearch(target, room, user, connection, cmd) {
		this.checkCan('lock');
		target = toID(target);
		if (!target) { // just join directly if it's the page cmd, they're likely looking for the full list
			if (cmd.includes('page')) return this.parse(`/j view-usersearch`);
			return this.parse(`/help usersearch`);
		}
		if (target.length < 3) {
			throw new Chat.ErrorMessage(`That's too short of a term to search for.`);
		}
		const showPage = cmd.includes('page');
		if (showPage) {
			this.parse(`/j view-usersearch-${target}`);
			return;
		}
		return this.sendReplyBox(React.createElement(SearchUsernames, { target: target, __self: this, __source: {fileName: _jsxFileName, lineNumber: 130}} ));
	},
	usersearchhelp: [
		`/usersearch [pattern]: Looks for all names matching the [pattern]. Requires: % @ &`,
		`Adding "page" to the end of the command, i.e. /usersearchpage OR /uspage will bring up a page.`,
		`See also /usnames for a staff-curated list of the most commonly searched terms.`,
	],
	usnames: 'usersearchnames',
	usersearchnames: {
		'': 'list',
		list() {
			this.parse(`/join view-usersearch`);
		},
		add(target, room, user) {
			this.checkCan('lock');
			const targets = target.split(',').map(toID).filter(Boolean);
			if (!targets.length) {
				return this.errorReply(`Specify at least one term.`);
			}
			for (const [i, arg] of targets.entries()) {
				if (exports.nameList.has(arg)) {
					targets.splice(i, 1);
					this.errorReply(`Term ${arg} is already on the usersearch term list.`);
					continue;
				}
				if (arg.length < 3) {
					targets.splice(i, 1);
					this.errorReply(`Term ${arg} is too short for the usersearch term list. Must be more than 3 characters.`);
					continue;
				}
				exports.nameList.add(arg);
			}
			if (!targets.length) {
				// fuck you too, "mia added 0 term to the usersearch name list"
				return this.errorReply(`No terms could be added.`);
			}
			const count = Chat.count(targets, 'terms');
			_optionalChain([Rooms, 'access', _ => _.get, 'call', _2 => _2('staff'), 'optionalAccess', _3 => _3.addByUser, 'call', _4 => _4(
				user, `${user.name} added the ${count} "${targets.join(', ')}" to the usersearch name list.`
			)]);
			this.globalModlog(`USERSEARCH ADD`, null, targets.join(', '));
			if (!room || room.roomid !== 'staff') {
				this.sendReply(`You added the ${count} "${targets.join(', ')}" to the usersearch name list.`);
			}
			saveNames();
		},
		remove(target, room, user) {
			this.checkCan('lock');
			const targets = target.split(',').map(toID).filter(Boolean);
			if (!targets.length) {
				return this.errorReply(`Specify at least one term.`);
			}
			for (const [i, arg] of targets.entries()) {
				if (!exports.nameList.has(arg)) {
					targets.splice(i, 1);
					this.errorReply(`${arg} is not in the usersearch name list, and has been skipped.`);
					continue;
				}
				exports.nameList.delete(arg);
			}
			if (!targets.length) {
				return this.errorReply(`No terms could be removed.`);
			}
			const count = Chat.count(targets, 'terms');
			_optionalChain([Rooms, 'access', _5 => _5.get, 'call', _6 => _6('staff'), 'optionalAccess', _7 => _7.addByUser, 'call', _8 => _8(
				user, `${user.name} removed the ${count} "${targets.join(', ')}" from the usersearch name list.`
			)]);
			this.globalModlog(`USERSEARCH REMOVE`, null, targets.join(', '));
			if (!room || room.roomid !== 'staff') {
				this.sendReply(`You removed the ${count} "${targets.join(', ')}"" from the usersearch name list.`);
			}
			saveNames();
		},
	},
	usnameshelp: [
		`/usnames add [...terms]: Adds the given [terms] to the usersearch name list. Requires: % @ &`,
		`/usnames remove [...terms]: Removes the given [terms] from the usersearch name list. Requires: % @ &`,
		`/usnames OR /usnames list: Shows the usersearch name list.`,
	],
}; exports.commands = commands;

 const pages = {
	usersearch(query, user) {
		this.checkCan('lock');
		const target = toID(query.shift());
		if (!target) {
			this.title = `[Usersearch Terms]`;
			const sorted = {};
			for (const curUser of Users.users.values()) {
				for (const term of exports.nameList) {
					if (curUser.id.includes(term)) {
						if (!(term in sorted)) sorted[term] = 0;
						sorted[term]++;
					}
				}
			}
			return React.createElement('div', { class: "pad", __self: this, __source: {fileName: _jsxFileName, lineNumber: 226}}
, React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 227}}, "Usersearch term list"  )
, React.createElement('button', { style: {float: 'right'}, class: "button", name: "send", value: "/uspage", __self: this, __source: {fileName: _jsxFileName, lineNumber: 228}}
, React.createElement('i', { class: "fa fa-refresh" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 229}}), " Refresh"
)
, React.createElement('hr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 231}} )
, !exports.nameList.size ?
					React.createElement('p', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 233}}, "None found." ) :
					React.createElement('div', { class: "ladder pad" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 234}}
, React.createElement('table', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 235}}
, React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 236}}
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 237}}, "Term")
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 238}}, "Current Matches" )
, React.createElement('th', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 239}})
)
, (() => {
								const buf = [];
								for (const k of _lib.Utils.sortBy(Object.keys(sorted), v => -sorted[v])) {
									buf.push(React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 244}}
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 245}}, k)
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 246}}, sorted[k])
, React.createElement('td', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 247}}, React.createElement('button', { class: "button", name: "send", value: `/uspage ${k}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 247}}, "Search"))
));
								}
								if (!buf.length) return React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 250}}, React.createElement('td', { colSpan: 3, style: {textAlign: 'center'}, __self: this, __source: {fileName: _jsxFileName, lineNumber: 250}}, "No names found."  ));
								return buf;
							})()
)
)
				
);
		}
		this.title = `[Usersearch] ${target}`;
		return React.createElement(SearchUsernames, { target: target, page: true, __self: this, __source: {fileName: _jsxFileName, lineNumber: 259}} );
	},
}; exports.pages = pages;

 //# sourceMappingURL=sourceMaps/usersearch.js.map