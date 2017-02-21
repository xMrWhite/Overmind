var roomBrain = require('brain_Room');
var brain = new roomBrain(this.name);

Object.defineProperty(Room.prototype, 'brain', {
    get () {
        return new roomBrain(this.name);
    },
    set () {
        console.log("cannot set Room.brain for " + this.name);
    }
});

//noinspection JSUnusedGlobalSymbols
Room.prototype.totalSourceCapacity = function () {
    if (this.memory.miningCapacity != undefined) {
        return this.memory.miningCapacity;
    } else {
        var capacity = 0;
        var sources = this.find(FIND_SOURCES);
        for (let i in sources) {
            capacity += sources[i].capacity();
        }
        this.memory.miningCapacity = capacity;
        return capacity;
    }
};

Room.prototype.fullestContainer = function () {
    // Set target to the fullest container in the room
    var containers = this.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType == STRUCTURE_CONTAINER &&
                       s.store[RESOURCE_ENERGY] > 0
    });
    if (containers.length > 0) { // loop through results to find the container with the most energy in the room
        var target = containers[0];
        var maxFullness = 0;
        for (let i in containers) {
            if (containers[i].store[RESOURCE_ENERGY] > maxFullness) {
                target = containers[i];
                maxFullness = containers[i].store[RESOURCE_ENERGY];
            }
        }
        return target;
    } else {
        return ERR_NO_TARGET_FOUND;
    }
};

Room.prototype.findCached = function (findKey, findFunction, reCache = false) {
    // findKey: key to store find results to, such as 'sources', 'towers', 'walls', etc.
    // findFunction: find call; ex: function(room) { return room.find(FIND_*) }
    // reCache: boolean to force the room to re-cache this search
    if (reCache || !this.memory.cache) { // Initialize cache
        this.memory.cache = {};
    }
    var findResults = [];
    // run search and cache or return cached results
    if (reCache || !this.memory.cache[findKey]) { // search
        this.memory.cache[findKey] = [];
        findResults = findFunction(this);
        // store find results in cache
        for (let item of findResults) {
            this.memory.cache[findKey].push(item.id); // ATTN: might be problematic for id-less things like flags
        }
    } else { // retrieve cached results
        for (let itemID of this.memory.cache[findKey]) {
            findResults.push(Game.getObjectById(itemID));
        }
    }
    return findResults;
};

Room.prototype.remainingMinerSourceAssignments = function () {
    var sources = this.find(FIND_SOURCES);
    var miners = this.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role == 'miner'});
    var assignments = {};
    for (let i in sources) {
        // assignment becomes a dictionary with source ID keys and number of remaining spots as values
        let numAssigned = _.filter(miners, (c) => c.memory.assignment == sources[i].id).length;
        let maxSpots = Math.min(sources[i].capacity(), 1);
        assignments[sources[i].id] = maxSpots - numAssigned;
    }
    return assignments;
};

Room.prototype.isUntargetedRepair = function () {
    // Set target to closest repair job that is not currently targeted by any other repairer
    // Ignore walls, ramparts, and roads above 20% health, since roads can be taken care of
    // more efficiently by repairNearbyDamagedRoads() function
    var structure = this.find(FIND_STRUCTURES, {
        filter: (s) => s.hits < s.hitsMax &&
                       s.isTargeted('repairer') == false &&
                       s.structureType != STRUCTURE_CONTAINER && // containers are repaired by miners
                       s.structureType != STRUCTURE_WALL &&
                       s.structureType != STRUCTURE_RAMPART &&
                       (s.structureType != STRUCTURE_ROAD || s.hits < 0.2 * s.hitsMax)
    });
    if (structure) {
        return OK;
    } else {
        return ERR_NO_TARGET_FOUND;
    }
};

Room.prototype.isWallLowerThan = function (hp) {
    // Set target to closest wall or rampart with less than hp hits; wall repairs allow duplicate repair jobs
    var wall = this.find(FIND_STRUCTURES, {
        filter: (s) => s.hits < hp && (s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART)
    });
    if (wall) {
        return OK;
    } else {
        return ERR_NO_TARGET_FOUND;
    }
};

Creep.prototype.isJob = function () {
    // Set target to closest construction job; allows duplicates
    var target = this.find(FIND_CONSTRUCTION_SITES);
    if (target) {
        return OK; // success
    } else {
        return ERR_NO_TARGET_FOUND; // no jobs found
    }
};

//noinspection JSUnusedGlobalSymbols
Room.prototype.convertAllCreeps = function (convertFrom, convertTo) {
    var creepsToConvert = this.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role == convertFrom});
    for (let i in creepsToConvert) {
        let creep = creepsToConvert[i];
        // Change role
        creep.memory.role = convertTo;
        // Clear mode
        creep.memory.mode = undefined;
        // Clear target
        creep.memory.target = undefined;
    }
};