// Creep prototypes

import {tasks} from '../maps/map_tasks';
import {Traveler, TravelToOptions} from "../lib/Traveler";
import {Task} from "../tasks/Task";
import {roles} from "../maps/map_roles";

Creep.prototype.run = function () { // run the creep's associated role
    let behavior = roles(this.memory.role);
    if (!this.spawning && behavior) {
        behavior.run(this);
    }
};

Creep.prototype.publicMessage = function (sayList) { // publically say each element of a list of strings
    if (!this.memory.data.sayCount) {
        this.memory.data.sayCount = 0;
    }
    let count = this.memory.data.sayCount;
    this.say(sayList[count], true);
    this.memory.data.sayCount = (count + 1) % sayList.length;
};

// Creep properties ====================================================================================================

Creep.prototype.getBodyparts = function (partType) {
    return _.filter(this.body, (part: BodyPartDefinition) => part.type == partType).length;
};

Object.defineProperty(Creep.prototype, 'needsReplacing', { // whether the creep needs replacing
    get: function () {
        if (this.ticksToLive) { // undefined when spawning
            let originSpawn = Game.rooms[this.memory.data.origin].spawns[0];
            let replaceAt = originSpawn.pathLengthTo(this.assignment) / this.moveSpeed; // expected travel time
            replaceAt += 3 * this.body.length; // expected spawning time
            return this.ticksToLive < replaceAt;
        } else {
            return false;
        }
    }
});

Object.defineProperty(Creep.prototype, 'workRoom', { // retrieve the room object (not the name) of the assigned room
    get: function () {
        return Game.rooms[this.memory.workRoom];
    },
    set: function (newWorkRoom) {
        this.task = null; // clear the task
        this.memory.workRoom = newWorkRoom.name;
    }
});

Object.defineProperty(Creep.prototype, 'colony', { // retrieve the colony object of the creep
    get: function () {
        return Overmind.Colonies[this.memory.colony];
    },
    set: function (newColony) {
        this.memory.colony = newColony.name;
    }
});

Object.defineProperty(Creep.prototype, 'lifetime', { // creep lifetime; 1500 unless claimer, then 500
    get: function () {
        if (_.map(this.body, (part: BodyPartDefinition) => part.type).includes(CLAIM)) {
            return 500;
        } else {
            return 1500;
        }
    }
});

Object.defineProperty(Creep.prototype, 'assignment', { // retrieve the assignment object
    get: function () {
        return deref(this.memory.assignment);
    },
    set: function (newAssignmentObject) {
        this.log("warning: unsafe change of creep assignment from " +
            this.memory.assignment + " to " + newAssignmentObject + "!");
        this.memory.assignment = newAssignmentObject.ref
    }
});


// Tasks and task assignment ===========================================================================================

Object.defineProperty(Creep.prototype, 'task', {
    get: function () { // provide new task object recreated from literals stored in creep.memory.task
        if (this.memory.task != null) {
            // NOTE: task migration operations should be performed here
            // if (this.memory.task.targetID) {
            //     this.memory.task.targetRef = this.memory.task.targetID;
            // }
            var target = deref(this.memory.task.targetRef);
            var task = tasks(this.memory.task.name, target) as Task;
            task.creepName = this.memory.task.creepName;
            task.targetCoords = this.memory.task.targetCoords;
            task.data = this.memory.task.data;
            return task;
        } else {
            return null;
        }
    },
    set: function (newTask) {
        if (newTask != null) {
            this.log("use Creep.assign() to assign tasks. Creep.task = ___ should only be used to null a task.");
        } else {
            this.memory.task = newTask;
        }
    }
});

Creep.prototype.assign = function (task: Task) { // wrapper for task.assign(creep, target)
    this.task = null;
    return task.assign(this);
};


// Moving and pathing ==================================================================================================

const traveler = new Traveler();
Creep.prototype.travelTo = function(destination: {pos: RoomPosition}, options?: TravelToOptions) {
    return traveler.travelTo(this, destination, options);
};

Object.defineProperty(Creep.prototype, 'moveSpeed', { // expected moveSpeed on roads in squares/tick; usually 1
    get: function () {
        if (!this.memory.data.moveSpeed) {
            var massiveParts = [WORK, ATTACK, RANGED_ATTACK, HEAL, TOUGH];
            var mass = 0;
            for (let part of massiveParts) {
                mass += this.getActiveBodyparts(part);
            }
            var moveParts = this.getActiveBodyparts(MOVE);
            var fatiguePerTick = 2 * mass;
            if (fatiguePerTick == 0) {
                this.memory.data.moveSpeed = 1;
            } else {
                this.memory.data.moveSpeed = Math.min(2 * moveParts / fatiguePerTick, 1);
            }
        }
        return this.memory.data.moveSpeed;
    }
});

Creep.prototype.repairNearbyDamagedRoad = function () {
    // repairs roads without sating any extra energy (requiring that there are numWorks*100 hp missing)
    // let damagedRoads = this.pos.findInRange(FIND_STRUCTURES, 3, {
    //     filter: (structure) => structure.structureType == STRUCTURE_ROAD &&
    //                            structure.hitsMax - structure.hits > this.getActiveBodyparts(WORK) * 100
    // });
    let damagedRoads = _.filter(this.pos.lookFor(LOOK_STRUCTURES),
        (s: Structure) => s.structureType == STRUCTURE_ROAD && s.hitsMax - s.hits > 100);//this.getActiveBodyparts(WORK) * 100);
    let damagedRoad = damagedRoads[0];
    if (damagedRoad) {
        return this.repair(damagedRoad);
    }
    return OK;
};
