"use strict";const _jsxFileName = "..\\server\\chat-jsx.tsx";Object.defineProperty(exports, "__esModule", {value: true});/**
 * PS custom HTML elements and Preact handling.
 * By Mia and Zarel
 */
var _preact = require('preact');
var _preactrendertostring = require('preact-render-to-string');
var _lib = require('../.lib-dist');

/** For easy concenation of Preact nodes with strings */
 function html(
	strings, ...args
) {
	let buf = strings[0];
	let i = 0;
	while (i < args.length) {
		buf += typeof args[i] === 'string' || typeof args[i] === 'number' ?
			_lib.Utils.escapeHTML(args[i] ) :
			_preactrendertostring.default.call(void 0, args[i] );
		buf += strings[++i];
	}
	return buf;
} exports.html = html;

/** client-side custom elements */









exports.render = _preactrendertostring.default;



 const h = _preact.default.h; exports.h = h;
 const Fragment = _preact.default.Fragment; exports.Fragment = Fragment;
 const Component = _preact.default.Component; exports.Component = Component;

 class FormatText extends _preact.default.Component {
	render() {
		const child = this.props.children;
		if (typeof child !== 'string') throw new Error(`Invalid props.children type: ${!child ? child : typeof child}`);
		return React.createElement('span', { dangerouslySetInnerHTML: 
			{__html: Chat.formatText(child, this.props.isTrusted, this.props.replaceLinebreaks)}
		, __self: this, __source: {fileName: _jsxFileName, lineNumber: 46}} );
	}
} exports.FormatText = FormatText;

 //# sourceMappingURL=sourceMaps/chat-jsx.js.map