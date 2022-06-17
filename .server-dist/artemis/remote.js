"use strict";Object.defineProperty(exports, "__esModule", {value: true});/**
 * Code for using Google's Perspective API for filters.
 * @author mia-pi-git
 */
var _lib = require('../../.lib-dist');
var _configloader = require('../config-loader');
var _dexdata = require('../../.sim-dist/dex-data');

// 20m. this is mostly here so we can use Monitor.slow()
const PM_TIMEOUT = 20 * 60 * 1000;
 const ATTRIBUTES = {
	"SEVERE_TOXICITY": {},
	"TOXICITY": {},
	"IDENTITY_ATTACK": {},
	"INSULT": {},
	"PROFANITY": {},
	"THREAT": {},
	"SEXUALLY_EXPLICIT": {},
	"FLIRTATION": {},
}; exports.ATTRIBUTES = ATTRIBUTES;








function time() {
	return Math.floor(Math.floor(Date.now() / 1000) / 60);
}

 class Limiter {
	
	__init() {this.lastTick = time()}
	__init2() {this.count = 0}
	constructor(max) {;Limiter.prototype.__init.call(this);Limiter.prototype.__init2.call(this);
		this.max = max;
	}
	shouldRequest() {
		const now = time();
		if (this.lastTick !== now) {
			this.count = 0;
			this.lastTick = now;
		}
		this.count++;
		return this.count < this.max;
	}
} exports.Limiter = Limiter;

function isCommon(message) {
	message = message.toLowerCase().replace(/\?!\., ;:/g, '');
	return ['gg', 'wp', 'ggwp', 'gl', 'hf', 'glhf', 'hello'].includes(message);
}

let throttleTime = null;
 const limiter = new Limiter(800); exports.limiter = limiter;
 const PM = new _lib.ProcessManager.QueryProcessManager(module, async text => {
	if (isCommon(text) || !exports.limiter.shouldRequest()) return null;
	if (throttleTime && (Date.now() - throttleTime < 10000)) {
		return null;
	}
	if (throttleTime) throttleTime = null;

	const requestData = {
		// todo - support 'es', 'it', 'pt', 'fr' - use user.language? room.settings.language...?
		languages: ['en'],
		requestedAttributes: exports.ATTRIBUTES,
		comment: {text},
	};
	try {
		const raw = await _lib.Net.call(void 0, `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze`).post({
			query: {
				key: _configloader.Config.perspectiveKey,
			},
			body: JSON.stringify(requestData),
			headers: {
				'Content-Type': "application/json",
			},
			timeout: 10 * 1000, // 10s
		});
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (data.error) throw new Error(data.message);
		const result = {};
		for (const k in data.attributeScores) {
			const score = data.attributeScores[k];
			result[k] = score.summaryScore.value;
		}
		return result;
	} catch (e) {
		throttleTime = Date.now();
		if (e.message.startsWith('Request timeout')) {
			// just ignore this. error on their end not ours.
			// todo maybe stop sending requests for a bit?
			return null;
		}
		Monitor.crashlog(e, 'A Perspective API request', {request: JSON.stringify(requestData)});
		return null;
	}
}, PM_TIMEOUT); exports.PM = PM;


// main module check necessary since this gets required in other non-parent processes sometimes
// when that happens we do not want to take over or set up or anything
if (require.main === module) {
	// This is a child process!
	global.Config = _configloader.Config;
	global.Monitor = {
		crashlog(error, source = 'A remote Artemis child process', details = null) {
			const repr = JSON.stringify([error.name, error.message, source, details]);
			process.send(`THROW\n@!!@${repr}\n${error.stack}`);
		},
		slow(text) {
			process.send(`CALLBACK\nSLOW\n${text}`);
		},
	};
	global.toID = _dexdata.toID;
	process.on('uncaughtException', err => {
		if (_configloader.Config.crashguard) {
			Monitor.crashlog(err, 'A remote Artemis child process');
		}
	});
	// eslint-disable-next-line no-eval
	_lib.Repl.start(`abusemonitor-remote-${process.pid}`, cmd => eval(cmd));
} else if (!process.send) {
	exports.PM.spawn(_configloader.Config.remoteartemisprocesses || 1);
}

 class RemoteClassifier {
	static  __initStatic() {this.PM = exports.PM}
	static  __initStatic2() {this.ATTRIBUTES = exports.ATTRIBUTES}
	classify(text) {
		if (!_configloader.Config.perspectiveKey) return Promise.resolve(null);
		return exports.PM.query(text);
	}
	async suggestScore(text, data) {
		if (!_configloader.Config.perspectiveKey) return Promise.resolve(null);
		const body = {
			comment: {text},
			attributeScores: {},
		};
		for (const k in data) {
			body.attributeScores[k] = {summaryScore: {value: data[k]}};
		}
		try {
			const raw = await _lib.Net.call(void 0, `https://commentanalyzer.googleapis.com/v1alpha1/comments:suggestscore`).post({
				query: {
					key: _configloader.Config.perspectiveKey,
				},
				body: JSON.stringify(body),
				headers: {
					'Content-Type': "application/json",
				},
				timeout: 10 * 1000, // 10s
			});
			return JSON.parse(raw);
		} catch (e) {
			return {error: e.message};
		}
	}
	destroy() {
		return exports.PM.destroy();
	}
	respawn() {
		return exports.PM.respawn();
	}
	spawn(number) {
		exports.PM.spawn(number);
	}
	getActiveProcesses() {
		return exports.PM.processes.length;
	}
} RemoteClassifier.__initStatic(); RemoteClassifier.__initStatic2(); exports.RemoteClassifier = RemoteClassifier;


 //# sourceMappingURL=sourceMaps/remote.js.map