import {Stats} from './stats/stats';

export class Mem {

	static formatOvermindMemory() {
		if (!Memory.Overmind) {
			Memory.Overmind = {};
		}
		if (!Memory.colonies) {
			Memory.colonies = {};
		}
	}

	static wrap(memory: any, memName: string, defaults = {}) {
		if (!memory[memName]) {
			memory[memName] = defaults;
		}
		return memory[memName];
	}

	static formatPathingMemory() {
		if (!Memory.pathing) {
			Memory.pathing = {} as PathingMemory; // Hacky workaround
		}
		_.defaults(Memory.pathing, {
			paths            : {},
			distances        : {},
			weightedDistances: {},
		});
	}

	static format() {
		// Format the memory as needed, done once every global reset
		this.formatOvermindMemory();
		this.formatPathingMemory();
		// Rest of memory formatting
		if (!Memory.settings) {
			Memory.settings = {};
		}
		_.defaults(Memory.settings, {
			enableVisuals: true,
		});
		if (!Memory.stats) {
			Memory.stats = {};
		}
		if (!Memory.stats.persistent) {
			Memory.stats.persistent = {};
		}
		// Changes to ensure backwards compatibility
		this.backwardsCompatibility();
	}

	static cleanCreeps() {
		// Clear memory for non-existent creeps
		for (let name in Memory.creeps) {
			if (!Game.creeps[name]) {
				delete Memory.creeps[name];
			}
		}
	}

	static cleanFlags() {
		// Clear memory for non-existent flags
		for (let name in Memory.flags) {
			if (!Game.flags[name]) {
				delete Memory.flags[name];
			}
		}
	}

	static cleanPathingMemory() {
		let distanceCleanProbability = 0.001;
		let weightedDistanceCleanProbability = 0.01;

		// Randomly clear some cached path lengths
		for (let pos1Name in Memory.pathing.distances) {
			if (_.isEmpty(Memory.pathing.distances[pos1Name])) {
				delete Memory.pathing.distances[pos1Name];
			} else {
				for (let pos2Name in Memory.pathing.distances[pos1Name]) {
					if (Math.random() < distanceCleanProbability) {
						delete Memory.pathing.distances[pos1Name][pos2Name];
					}
				}
			}
		}

		// Randomly clear weighted distances
		for (let pos1Name in Memory.pathing.weightedDistances) {
			if (_.isEmpty(Memory.pathing.weightedDistances[pos1Name])) {
				delete Memory.pathing.weightedDistances[pos1Name];
			} else {
				for (let pos2Name in Memory.pathing.weightedDistances[pos1Name]) {
					if (Math.random() < weightedDistanceCleanProbability) {
						delete Memory.pathing.weightedDistances[pos1Name][pos2Name];
					}
				}
			}
		}
	}

	static clean() {
		// Clean the memory of non-existent objects every tick
		this.cleanCreeps();
		this.cleanFlags();
		this.cleanPathingMemory();
		Stats.clean();
	}

	static backwardsCompatibility() {
		// // Delete old profiler memory to migrate to new one
		// if (Memory.profiler && Memory.profiler.data) {
		// 	delete Memory.profiler;
		// }
		// // Convert all haulers to transporters
		// for (let name in Game.creeps) {
		// 	let creep = Game.creeps[name];
		// 	if (creep.memory.role == 'hauler') {
		// 		creep.memory.role = 'transport';
		// 		creep.memory.overlord = creep.memory.colony + ':logistics';
		// 		creep.memory.task = null;
		// 	}
		// }
		// // // Convert all transporters back to haulers in case I need to revert this
		// // for (let name in Game.creeps) {
		// // 	let creep = Game.creeps[name];
		// // 	if (creep.memory.role == 'transport') {
		// // 		let creepRoom = Game.rooms[creep.memory.colony];
		// // 		if (creepRoom && creepRoom.storage) {
		// // 			creep.memory.role = 'hauler';
		// // 			creep.memory.overlord = 'miningGroup:' + creepRoom.storage.id + ':transport';
		// // 			creep.memory.task = null;
		// // 		}
		// // 	}
		// // }
	}
}