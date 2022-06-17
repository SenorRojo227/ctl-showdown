"use strict";Object.defineProperty(exports, "__esModule", {value: true});/**
 * @author mia-pi-git
 */
var _local = require('./local');
var _remote = require('./remote');

exports.LocalClassifier = _local.LocalClassifier; exports.RemoteClassifier = _remote.RemoteClassifier;

 function destroy() {
	void _local.LocalClassifier.destroy();
	void _remote.RemoteClassifier.PM.destroy();
} exports.destroy = destroy;

 //# sourceMappingURL=sourceMaps/index.js.map