"use strict";Object.defineProperty(exports, "__esModule", {value: true}); const Items = {
	chillytite: {
		name: "Chillytite",
		spritenum: 594,
		megaStone: "Chillyte-Mega",
		megaEvolves: "Chillyte",
		itemUser: ["Chillyte"],
		onTakeItem(item, source) {
			if (item.megaEvolves === source.baseSpecies.baseSpecies) return false;
			return true;
		},
		num: 673,
		gen: 8,
		isNonstandard: "Past",
		desc: "If held by a Chillyte, this item allows it to Mega Evolve in battle.",
	},
}; exports.Items = Items;

 //# sourceMappingURL=sourceMaps/items.js.map