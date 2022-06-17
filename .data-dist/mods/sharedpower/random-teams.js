"use strict";Object.defineProperty(exports, "__esModule", {value: true});
var _randomteams = require('../../random-teams');

 class RandomSharedPowerTeams extends _randomteams.default {
	constructor(format, prng) {
		super(format, prng);
	}

	getPokemonPool(
		type,
		pokemonToExclude = [],
		isMonotype = false,
	) {
		const exclude = ['golisopod', ...pokemonToExclude.map(p => toID(p.species))];
		const pokemonPool = [];
		for (let species of this.dex.species.all()) {
			if (species.gen > this.gen || exclude.includes(species.id)) continue;
			if (this.dex.currentMod === 'gen8bdsp' && species.gen > 4) continue;
			if (isMonotype) {
				if (!species.types.includes(type)) continue;
				if (typeof species.battleOnly === 'string') {
					species = this.dex.species.get(species.battleOnly);
					if (!species.types.includes(type)) continue;
				}
			}
			pokemonPool.push(species.id);
		}
		return pokemonPool;
	}
} exports.RandomSharedPowerTeams = RandomSharedPowerTeams;

exports. default = RandomSharedPowerTeams;

 //# sourceMappingURL=sourceMaps/random-teams.js.map