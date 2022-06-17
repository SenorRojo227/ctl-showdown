"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Typescript wrapper around the Python Artemis model.
 * By Mia.
 * @author mia-pi-git
 */

var _child_process = require('child_process'); var child_process = _child_process;
var _lib = require('../../.lib-dist');
var _configloader = require('../config-loader');
var _dexdata = require('../../.sim-dist/dex-data');

class ArtemisStream extends _lib.Streams.ObjectReadWriteStream {
	__init() {this.tasks = new Set()}
	
	constructor() {
		super();ArtemisStream.prototype.__init.call(this);;
		this.process = child_process.spawn('python3', [
			'-u', __dirname + '/model.py', _configloader.Config.debugartemisprocesses ? "debug" : "",
		].filter(Boolean));
		this.listen();
	}
	listen() {
		this.process.stdout.setEncoding('utf8');
		this.process.stderr.setEncoding('utf8');
		this.process.stdout.on('data', (data) => {
			// so many bugs were created by \nready\n
			data = data.trim();
			const [taskId, dataStr] = data.split("|");
			if (this.tasks.has(taskId)) {
				this.tasks.delete(taskId);
				return this.push(`${taskId}\n${dataStr}`);
			}
			if (taskId === 'error') { // there was a major crash and the script is no longer running
				const info = JSON.parse(dataStr);
				Monitor.crashlog(new Error(info.error), "An Artemis script", info);
				try {
					this.pushEnd(); // push end first so the stream always closes
					this.process.disconnect();
				} catch (e) {}
			}
		});
		this.process.stderr.on('data', data => {
			if (/Downloading: ([0-9]+)%/i.test(data)) {
				// this prints to stderr fsr and it should not be throwing
				return;
			}
			Monitor.crashlog(new Error(data), "An Artemis process");
		});
		this.process.on('error', err => {
			Monitor.crashlog(err, "An Artemis process");
			this.pushEnd();
		});
		this.process.on('close', () => {
			this.pushEnd();
		});
	}
	_write(chunk) {
		const [taskId, message] = _lib.Utils.splitFirst(chunk, '\n');
		this.tasks.add(taskId);
		this.process.stdin.write(`${taskId}|${message}\n`);
	}
	destroy() {
		try {
			this.process.kill();
		} catch (e2) {}
		this.pushEnd();
	}
}

 const PM = new _lib.ProcessManager.StreamProcessManager(module, () => new ArtemisStream(), message => {
	if (message.startsWith('SLOW\n')) {
		Monitor.slow(message.slice(5));
	}
}); exports.PM = PM;

 class LocalClassifier {
	static  __initStatic() {this.PM = exports.PM}
	static  __initStatic2() {this.ATTRIBUTES = {
		sexual_explicit: {},
		severe_toxicity: {},
		toxicity: {},
		obscene: {},
		identity_attack: {},
		insult: {},
		threat: {},
	}}
	static __initStatic3() {this.classifiers = []}
	static destroy() {
		for (const classifier of this.classifiers) void classifier.destroy();
		return this.PM.destroy();
	}
	/** If stream exists, model is usable */
	
	__init2() {this.enabled = false}
	__init3() {this.requests = new Map()}
	__init4() {this.lastTask = 0}
	__init5() {this.readyPromise = null}
	constructor() {;LocalClassifier.prototype.__init2.call(this);LocalClassifier.prototype.__init3.call(this);LocalClassifier.prototype.__init4.call(this);LocalClassifier.prototype.__init5.call(this);
		LocalClassifier.classifiers.push(this);
		void this.setupProcesses();
	}
	async setupProcesses() {
		this.readyPromise = new Promise(resolve => {
			child_process.exec('python3 -c "import detoxify"', (err, out, stderr) => {
				if (err || stderr) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
		const res = await this.readyPromise;
		this.enabled = res;
		this.readyPromise = null;
		if (res) {
			this.stream = exports.PM.createStream();
			void this.listen();
		}
	}
	async listen() {
		if (!this.stream) return null;
		for await (const chunk of this.stream) {
			const [rawTaskId, data] = _lib.Utils.splitFirst(chunk, '\n');
			const task = parseInt(rawTaskId);
			const resolver = this.requests.get(task);
			if (resolver) {
				resolver(JSON.parse(data));
				this.requests.delete(task);
			}
		}
	}
	destroy() {
		LocalClassifier.classifiers.splice(LocalClassifier.classifiers.indexOf(this), 1);
		return _optionalChain([this, 'access', _ => _.stream, 'optionalAccess', _2 => _2.destroy, 'call', _3 => _3()]);
	}
	async classify(text) {
		if (this.readyPromise) await this.readyPromise;
		if (!this.stream) return null;
		const taskId = this.lastTask++;
		const data = await new Promise(resolve => {
			this.requests.set(taskId, resolve);
			void _optionalChain([this, 'access', _4 => _4.stream, 'optionalAccess', _5 => _5.write, 'call', _6 => _6(`${taskId}\n${text}`)]);
		});
		for (const k in data) {
			// floats have to be made into strings because python's json.dumps
			// doesn't like float32s
			data[k] = parseFloat(data[k]);
		}
		return data ;
	}
} LocalClassifier.__initStatic(); LocalClassifier.__initStatic2(); LocalClassifier.__initStatic3(); exports.LocalClassifier = LocalClassifier;

// main module check necessary since this gets required in other non-parent processes sometimes
// when that happens we do not want to take over or set up or anything
if (require.main === module) {
	// This is a child process!
	global.Config = _configloader.Config;
	global.Monitor = {
		crashlog(error, source = 'A local Artemis child process', details = null) {
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
			Monitor.crashlog(err, 'A local Artemis child process');
		}
	});
	// eslint-disable-next-line no-eval
	_lib.Repl.start(`abusemonitor-local-${process.pid}`, cmd => eval(cmd));
} else if (!process.send) {
	exports.PM.spawn(_configloader.Config.localartemisprocesses || 1);
}

 //# sourceMappingURL=sourceMaps/local.js.map