"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const constants_1 = require("../../utils/constants");
const data_1 = require("../../utils/data");
const math_1 = require("../../utils/math");
const survivBitStream_1 = require("../../utils/survivBitStream");
const misc_1 = require("../../utils/misc");
const deadBody_1 = require("./deadBody");
const killPacket_1 = require("../../packets/sending/killPacket");
const gameObject_1 = require("../gameObject");
const planck_1 = require("planck");
const roleAnnouncementPacket_1 = require("../../packets/sending/roleAnnouncementPacket");
const gameOverPacket_1 = require("../../packets/sending/gameOverPacket");
const loot_1 = require("./loot");
const bullet_1 = require("../bullet");
const obstacle_1 = require("./obstacle");
const projectile_1 = require("./projectile");
class Player extends gameObject_1.GameObject {
    isPlayer = true;
    isObstacle = false;
    isBullet = false;
    isLoot = false;
    collidesWith = {
        player: false,
        obstacle: true,
        bullet: true,
        loot: false,
        projectile: false
    };
    socket;
    map;
    name;
    teamId;
    groupId;
    direction = (0, planck_1.Vec2)(1, 0);
    distanceToMouse;
    scale = 1;
    _zoom;
    xCullDist;
    yCullDist;
    visibleObjects = new Set(); // Objects the player can see
    nearObjects = new Set(); // Objects the player can see with a 1x scope
    partialDirtyObjects = new Set(); // Objects that need to be partially updated
    fullDirtyObjects = new Set(); // Objects that need to be fully updated
    deletedObjects = new Set(); // Objects that need to be deleted
    moving = false;
    movingUp = false;
    movingDown = false;
    movingLeft = false;
    movingRight = false;
    shooting = false;
    shootStart = false;
    shootHold = false;
    anim = {
        active: false,
        type: 0,
        seq: 0,
        time: -1,
        duration: 0
    };
    _health = 1000; // The player's health. Ranges from 0-100.
    _boost = 0; // The player's adrenaline. Ranges from 0-100.
    kills = 0;
    downed = false; // Whether the player is downed (knocked out)
    disconnected = false; // Whether the player has left the game
    deadPos;
    damageable = true;
    lastObstacleInteractionTime = 0;
    lastLootInteractionTime = 0;
    fullUpdate = true;
    playerStatusDirty = true;
    groupStatusDirty = false;
    planesDirty = false;
    airstrikeZonesDirty = false;
    mapIndicatorsDirty = false;
    activePlayerIdDirty = true;
    healthDirty = true;
    boostDirty = true;
    zoomDirty = true;
    weaponsDirty = true;
    inventoryDirty = true;
    inventoryEmpty = true;
    spectatorCountDirty = false;
    movesSinceLastUpdate = 0;
    isMobile;
    touchMoveDir;
    emotes = new Set();
    explosions = new Set();
    body; // The player's Planck.js Body
    loadout = {
        outfit: data_1.TypeToId.outfitBase,
        melee: data_1.TypeToId.fists,
        meleeType: "fists",
        heal: data_1.TypeToId.heal_basic,
        boost: data_1.TypeToId.boost_basic,
        emotes: [data_1.TypeToId.emote_happyface, data_1.TypeToId.emote_thumbsup, data_1.TypeToId.emote_surviv, data_1.TypeToId.emote_sadface, 0, 0]
    };
    backpackLevel = 0;
    chestLevel = 0;
    helmetLevel = 0;
    inventory = {
        "9mm": 0,
        "762mm": 0,
        "556mm": 0,
        "12gauge": 0,
        "50AE": 0,
        "308sub": 0,
        flare: 0,
        "45acp": 0,
        frag: 0,
        smoke: 0,
        strobe: 0,
        mirv: 0,
        snowball: 0,
        potato: 0,
        bandage: 0,
        healthkit: 0,
        soda: 0,
        painkiller: 0,
        "1xscope": 0,
        "2xscope": 0,
        "4xscope": 1,
        "8xscope": 0,
        "15xscope": 0
    };
    scope = {
        typeString: "1xscope",
        typeId: data_1.TypeToId["1xscope"]
    };
    weapons = [
        {
            typeString: "",
            typeId: 0,
            ammo: 0,
            cooldown: 0,
            cooldownDuration: 0,
            switchCooldown: 0,
            weaponType: constants_1.WeaponType.Gun
        },
        {
            typeString: "",
            typeId: 0,
            ammo: 0,
            cooldown: 0,
            cooldownDuration: 0,
            switchCooldown: 0,
            weaponType: constants_1.WeaponType.Gun
        },
        {
            typeString: "fists",
            typeId: data_1.TypeToId.fists,
            cooldown: 0,
            cooldownDuration: 250,
            switchCooldown: 0,
            weaponType: constants_1.WeaponType.Melee
        },
        {
            typeString: "",
            typeId: 0,
            count: 0,
            cooldown: 0,
            cooldownDuration: 0,
            switchCooldown: 0,
            weaponType: constants_1.WeaponType.Throwable
        }
    ];
    selectedWeaponSlot = 2;
    lastWeaponSlot = this.selectedWeaponSlot;
    actionItem;
    scopeToResetTo = "1xscope";
    performActionAgain = false;
    lastActionType = 0;
    lastActionItem;
    actionDirty = false;
    usingItem = false;
    actionType = 0;
    actionSeq = 0;
    lastShotHand = "right";
    speed = data_1.Config.movementSpeed;
    diagonalSpeed = data_1.Config.diagonalSpeed;
    role = 0;
    roleLost = false;
    joinTime;
    damageDealt = 0;
    damageTaken = 0;
    _buildingZoom = 0;
    wasInBuildingAsOfLastCheck = false;
    killedBy;
    spectators = new Set();
    spectating;
    isSpectator = false;
    spectateBegin = false;
    spectateNext = false;
    spectatePrevious = false;
    spectateForce = false;
    constructor(position, socket, game, name, loadout) {
        super(game, "", position, 0);
        this.kind = constants_1.ObjectKind.Player;
        // Misc
        this.game = game;
        this.map = this.game.map;
        this.socket = socket;
        this.teamId = this.groupId = this.game.nextGroupId;
        this.name = name;
        this.zoom = constants_1.Constants.scopeZoomRadius.desktop["1xscope"];
        this.actionItem = { typeString: "", typeId: 0, duration: 0, useEnd: -1 };
        this.joinTime = Date.now();
        // Set loadout
        if (data_1.AllowedSkins.includes(loadout.outfit))
            this.loadout.outfit = data_1.TypeToId[loadout.outfit];
        if (data_1.AllowedMelee.includes(loadout.melee)) {
            this.loadout.melee = data_1.TypeToId[loadout.melee];
            this.loadout.meleeType = loadout.melee;
        }
        if (data_1.AllowedHeal.includes(loadout.heal))
            this.loadout.heal = data_1.TypeToId[loadout.heal];
        if (data_1.AllowedBoost.includes(loadout.boost))
            this.loadout.boost = data_1.TypeToId[loadout.boost];
        if (loadout.emotes) {
            for (let i = 0; i < 6; i++) {
                const emote = loadout.emotes[i];
                if (data_1.AllowedEmotes.includes(emote)) {
                    this.loadout.emotes[i] = data_1.TypeToId[emote];
                }
            }
        }
        this.weapons[2].typeString = this.loadout.meleeType;
        this.weapons[2].typeId = this.loadout.melee;
        /*
        // Quickswitching test
        this.inventory["762mm"] = 120;
        this.weapons[0].typeString = "sv98";
        this.weapons[0].typeId = TypeToId.sv98;
        this.weapons[1].typeString = "sv98";
        this.weapons[1].typeId = TypeToId.sv98;
        */
        // Spawn w/ random ammo & healing items in late game
        if (game.spawnWithGoodies) {
            switch ((0, math_1.random)(1, 4)) {
                case 1:
                    this.inventory["9mm"] = 60;
                    break;
                case 2:
                    this.inventory["12gauge"] = 10;
                    break;
                case 3:
                    this.inventory["762mm"] = 60;
                    break;
                case 4:
                    this.inventory["556mm"] = 60;
                    break;
            }
            switch ((0, math_1.random)(1, 4)) {
                case 1:
                    this.inventory.bandage = 5;
                    break;
                case 2:
                    this.inventory.healthkit = 1;
                    break;
                case 3:
                    this.inventory.soda = 2;
                    break;
                case 4:
                    this.inventory.painkiller = 1;
                    break;
            }
        }
        // Init body
        this.body = game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true
        });
        this.body.createFixture({
            shape: (0, planck_1.Circle)(1),
            friction: 0.0,
            density: 1000.0,
            restitution: 0.0,
            userData: this
        });
    }
    setVelocity(xVel, yVel) {
        this.body.setLinearVelocity((0, planck_1.Vec2)(xVel, yVel));
        if (xVel !== 0 || yVel !== 0) {
            this.moving = true;
            this.movesSinceLastUpdate++;
        }
    }
    get position() {
        return this.deadPos ? this.deadPos : this.body.getPosition();
    }
    get zoom() {
        return this._zoom;
    }
    set zoom(zoom) {
        this._zoom = zoom;
        this.xCullDist = this._zoom * 1.5;
        this.yCullDist = this._zoom * 1.25;
        this.zoomDirty = true;
    }
    spawnBullet(offset = 0, weaponTypeString) {
        if (this.activeWeapon.typeString !== weaponTypeString)
            return;
        let shotFx = true;
        const weapon = data_1.Weapons[weaponTypeString];
        const spread = (0, math_1.degreesToRadians)(weapon.shotSpread);
        for (let i = 0; i < weapon.bulletCount; i++) {
            const angle = (0, math_1.unitVecToRadians)(this.direction) + (0, math_1.randomFloat)(-spread, spread);
            const bullet = new bullet_1.Bullet(this, (0, planck_1.Vec2)(this.position.x + (offset * Math.cos(angle + Math.PI / 2)) + 1.0001 * Math.cos(angle), this.position.y + (offset * Math.sin(angle + Math.PI / 2)) + 1.0001 * Math.sin(angle)), (0, planck_1.Vec2)(Math.cos(angle), Math.sin(angle)), weapon.bulletType, 
            // hack wtf?
            this.activeWeapon, shotFx, this.layer, this.game);
            // usas
            if (weapon.toMouseHit) {
                bullet.maxDistance = Math.min(this.distanceToMouse, bullet.maxDistance * 2);
                bullet.clipDistance = true;
            }
            bullet.shotOffhand = this.lastShotHand === "right";
            this.game.bullets.add(bullet);
            this.game.newBullets.add(bullet);
            shotFx = false;
        }
        this.weaponsDirty = true;
        if ("ammo" in this.activeWeapon) {
            this.activeWeapon.ammo--;
            if (this.activeWeapon.ammo < 0)
                this.activeWeapon.ammo = 0;
            if (this.activeWeapon.ammo === 0) {
                this.shooting = false;
                this.reload();
            }
        }
    }
    setScope(scope, skipScope) {
        if (this.scope.typeString !== scope && skipScope && scope) {
            const direction = constants_1.ScopeTypes.indexOf(scope) > constants_1.ScopeTypes.indexOf(this.scope.typeString) ? 1 : -1;
            while (!this.inventory[scope]) {
                const newScope = constants_1.ScopeTypes[(0, math_1.clamp)(constants_1.ScopeTypes.indexOf(scope) + direction, 0, constants_1.ScopeTypes.length - 1)];
                if (newScope === scope)
                    break;
                scope = newScope;
            }
        }
        if (!this.inventory[scope])
            return;
        this.scope.typeString = scope;
        this.scope.typeId = data_1.TypeToId[scope];
        if (this.isMobile)
            this.zoom = constants_1.Constants.scopeZoomRadius.mobile[scope];
        else
            this.zoom = constants_1.Constants.scopeZoomRadius.desktop[scope];
        this.inventoryDirty = true;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get activeWeapon() {
        return this.weapons[this.selectedWeaponSlot];
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get activeWeaponInfo() {
        return data_1.Weapons[this.activeWeapon.typeString];
    }
    switchSlot(slot, skipSlots) {
        let chosenSlot = slot;
        Player.resetSpeedAfterShooting(this);
        if (!this.weapons[chosenSlot]?.typeId && skipSlots) {
            const wrapSlots = (n) => ((n % 4) + 4) % 4;
            if (!this.weapons[0].typeId && !this.weapons[1].typeId)
                return;
            const direction = this.selectedWeaponSlot < slot ? 1 : -1;
            chosenSlot = wrapSlots(chosenSlot + direction);
            while (!this.weapons[chosenSlot]?.typeId) {
                chosenSlot = wrapSlots(chosenSlot + direction);
            }
        }
        else if (!this.weapons[chosenSlot]?.typeId)
            return;
        this.cancelAction();
        this.performActionAgain = false;
        if (this.selectedWeaponSlot !== slot)
            this.lastWeaponSlot = this.selectedWeaponSlot;
        this.selectedWeaponSlot = chosenSlot;
        if (chosenSlot === 2)
            this.activeWeapon.cooldownDuration = this.activeWeaponInfo.attack.cooldownTime * 1000;
        else
            this.activeWeapon.cooldownDuration = this.activeWeaponInfo.fireDelay * 1000;
        if ((chosenSlot === 0 || chosenSlot === 1) && this.activeWeapon.ammo === 0)
            this.reload();
        this.activeWeapon.switchCooldown = Date.now();
        this.weaponsDirty = true;
        this.game.fullDirtyObjects.add(this);
        this.fullDirtyObjects.add(this);
    }
    dropItemInSlot(slot, item, skipItemSwitch) {
        // For guns:
        // Only drop the gun if it's the same as the one we have, AND it's in the selected slot
        if (this.weapons[slot].typeString === item) {
            if (this.weapons[slot].typeId === 0)
                return;
            const isDualWielded = this.weapons[slot].typeString.endsWith("dual");
            if (this.weapons[slot].ammo > 0) {
                // Put the ammo in the gun back in the inventory
                const ammoType = data_1.Weapons[this.weapons[slot].typeString].ammo;
                this.inventory[ammoType] += this.weapons[slot].ammo; // TODO Make this.inventory a Map to prevent this mess
                // If the new amount is more than the inventory can hold, drop the extra
                const overAmount = this.inventory[ammoType] - constants_1.Constants.bagSizes[ammoType][this.backpackLevel];
                if (overAmount > 0) {
                    (0, loot_1.splitUpLoot)(this, ammoType, overAmount);
                    (this.inventory[ammoType]) -= overAmount;
                }
                this.inventoryDirty = true;
            }
            if (slot === constants_1.ItemSlot.Melee) {
                this.weapons[slot] = {
                    typeString: "fists",
                    typeId: data_1.TypeToId.fists,
                    cooldown: 0,
                    cooldownDuration: 250,
                    switchCooldown: 0,
                    weaponType: constants_1.WeaponType.Melee
                };
            }
            else if (slot === constants_1.ItemSlot.Throwable) {
                this.weapons[slot] = {
                    typeString: "",
                    typeId: 0,
                    count: 0,
                    cooldown: 0,
                    cooldownDuration: 0,
                    switchCooldown: 0,
                    weaponType: constants_1.WeaponType.Throwable
                };
            }
            else {
                this.weapons[slot] = {
                    typeString: "",
                    typeId: 0,
                    ammo: 0,
                    cooldown: 0,
                    cooldownDuration: 0,
                    switchCooldown: 0,
                    weaponType: constants_1.WeaponType.Gun
                };
            }
            if (this.selectedWeaponSlot === slot && !skipItemSwitch)
                this.switchSlot(2);
            this.cancelAction();
            this.weaponsDirty = true;
            if (isDualWielded) {
                const singleGun = item.substring(0, item.lastIndexOf("_"));
                // TODO: Adjust gun positions to reduce overlap.
                /* eslint-disable no-new */
                new loot_1.Loot(this.game, singleGun, this.position, this.layer, 1);
                new loot_1.Loot(this.game, singleGun, this.position, this.layer, 1);
            }
            else {
                new loot_1.Loot(this.game, item, this.position, this.layer, 1);
                /* eslint-enable no-new */
            }
            this.game.updateObjects = true;
        }
        // For individual items
        if (slot === constants_1.ItemSlot.Primary) {
            const inventoryCount = this.inventory[item];
            const isHelmet = item.startsWith("helmet");
            const isVest = item.startsWith("chest");
            this.cancelAction();
            if (isHelmet || isVest) {
                if (isHelmet) {
                    const level = this.helmetLevel;
                    if (level === 0)
                        return;
                    /* eslint-disable-next-line no-new */
                    new loot_1.Loot(this.game, `helmet0${this.helmetLevel}`, this.position, this.layer, 1);
                    this.helmetLevel = 0;
                    this.fullDirtyObjects.add(this);
                    this.game.fullDirtyObjects.add(this);
                }
                else {
                    const level = this.chestLevel;
                    if (level === 0)
                        return;
                    /* eslint-disable-next-line no-new */
                    new loot_1.Loot(this.game, `chest0${this.chestLevel}`, this.position, this.layer, 1);
                    this.chestLevel = 0;
                    this.fullDirtyObjects.add(this);
                    this.game.fullDirtyObjects.add(this);
                }
            }
            if (inventoryCount) {
                const isAmmo = constants_1.AmmoTypes.includes(item);
                // const isMed = MedTypes.includes(item);
                const isScope = constants_1.ScopeTypes.includes(item);
                if (isScope) {
                    if (inventoryCount === "1xscope")
                        return;
                    let scopeToSwitchTo = constants_1.ScopeTypes[constants_1.ScopeTypes.indexOf(item) - 1];
                    let timeout = 0;
                    while (!this.inventory[scopeToSwitchTo]) {
                        scopeToSwitchTo = constants_1.ScopeTypes[constants_1.ScopeTypes.indexOf(scopeToSwitchTo) - 1];
                        if (++timeout > 8)
                            return;
                    }
                    this.inventoryDirty = true;
                    this.inventory[item] = 0;
                    /* eslint-disable-next-line no-new */
                    new loot_1.Loot(this.game, item, this.position, this.layer, 1);
                    if (this.scope.typeString === item)
                        this.setScope(scopeToSwitchTo);
                    return;
                }
                let amountToDrop = Math.floor(inventoryCount / 2);
                amountToDrop = Math.max(1, amountToDrop);
                if (inventoryCount <= 15 && isAmmo && item === "9mm") {
                    amountToDrop = Math.min(15, inventoryCount);
                }
                else if (inventoryCount <= 10 && isAmmo && (item === "762mm" || item === "556mm" || item === "308sub" || item === "45acp" || item === "50AE")) {
                    amountToDrop = Math.min(10, inventoryCount);
                }
                else if (inventoryCount <= 5 && isAmmo && item === "12gauge") {
                    amountToDrop = Math.min(5, inventoryCount);
                }
                else if (isAmmo && item === "flare") {
                    amountToDrop = 1;
                }
                else if (inventoryCount <= 5 && isAmmo) {
                    amountToDrop = Math.min(5, inventoryCount);
                }
                this.inventory[item] = inventoryCount - amountToDrop;
                this.inventoryDirty = true;
                (0, loot_1.splitUpLoot)(this, item, amountToDrop);
            }
        }
    }
    swapWeaponSlots() {
        const primary = (0, misc_1.deepCopy)(this.weapons[0]);
        this.weapons[0] = (0, misc_1.deepCopy)(this.weapons[1]);
        this.weapons[1] = primary;
        let lastWeapon = this.lastWeaponSlot;
        if (this.selectedWeaponSlot === 0)
            this.switchSlot(1);
        else if (this.selectedWeaponSlot === 1)
            this.switchSlot(0);
        else
            this.switchSlot(this.selectedWeaponSlot);
        if (lastWeapon === 0)
            lastWeapon = 1;
        else if (lastWeapon === 1)
            lastWeapon = 0;
        this.lastWeaponSlot = lastWeapon;
    }
    weaponCooldownOver() {
        return Date.now() - this.activeWeapon.cooldown >= this.activeWeapon.cooldownDuration &&
            (this.activeWeaponInfo.weaponClass !== "sniper"
                ? Date.now() - (this.activeWeaponInfo.switchDelay * 1000) >= this.activeWeapon.switchCooldown
                : true);
    }
    useMelee() {
        // Start punching animation
        if (!this.anim.active) {
            this.anim.active = true;
            this.anim.type = 1;
            this.anim.seq = 1;
            this.anim.time = 0;
            this.anim.duration = this.activeWeaponInfo.animDuration ?? 8;
            this.fullDirtyObjects.add(this);
        }
        this.cancelAction();
        const weapon = data_1.Weapons[this.activeWeapon.typeString];
        const offset = planck_1.Vec2.add(weapon.attack.offset, (0, planck_1.Vec2)(1, 0).mul(this.scale - 1));
        const angle = (0, math_1.unitVecToRadians)(this.direction);
        const position = this.position.clone().add((0, math_1.vec2Rotate)(offset, angle));
        const radius = weapon.attack.rad;
        if (weapon.cleave) { // cleave allows weapon to damage multiple objects at once
            // Damage all objects within melee range
            for (const object of this.visibleObjects) {
                if (!object.dead && object !== this && (0, math_1.sameLayer)(this.layer, object.layer) && ((object.interactable && object instanceof obstacle_1.Obstacle) ? true : object.damageable)) {
                    if ((0, math_1.objectCollision)(object, position, radius).collided) {
                        let attackTime;
                        if (this.activeWeaponInfo.attack) {
                            attackTime = this.activeWeaponInfo.attack.damageTimes[0] * 1000;
                        }
                        else {
                            attackTime = 0;
                            (0, misc_1.log)(`[WARNING] Attack time not found for weapon: "${this.activeWeapon.typeString}"`);
                        }
                        if (object instanceof Player) {
                            setTimeout(() => {
                                if (!object.dead)
                                    object.damage(weapon.damage, this, this.activeWeapon);
                            }, attackTime);
                        }
                        else {
                            setTimeout(() => {
                                if (!object.dead && object.damageable)
                                    object.damage(weapon.damage * weapon.obstacleDamage, this);
                            }, attackTime);
                        }
                        if (object.interactable)
                            this.interactWith(object);
                    }
                }
            }
        }
        else {
            // Damage the closest object
            let minDist = Number.MAX_VALUE;
            let closestObject;
            for (const object of this.visibleObjects) {
                if (!object.dead && object !== this && (0, math_1.sameLayer)(this.layer, object.layer) && ((object.interactable && object instanceof obstacle_1.Obstacle) ? true : object.damageable)) {
                    const record = (0, math_1.objectCollision)(object, position, radius);
                    if (record.collided && record.distance < minDist) {
                        minDist = record.distance;
                        closestObject = object;
                    }
                }
            }
            if (closestObject) {
                let attackTime;
                if (this.activeWeaponInfo.attack) {
                    attackTime = this.activeWeaponInfo.attack.damageTimes[0] * 1000;
                }
                else {
                    attackTime = 0;
                    (0, misc_1.log)(`[WARNING] Attack time not found for weapon: "${this.activeWeapon.typeString}"`);
                }
                if (closestObject instanceof Player) {
                    setTimeout(() => {
                        if (!closestObject.dead)
                            closestObject.damage(weapon.damage, this, this.activeWeapon);
                    }, attackTime);
                }
                else {
                    setTimeout(() => {
                        if (!closestObject.dead && closestObject.damageable)
                            closestObject.damage(weapon.damage * weapon.obstacleDamage, this);
                    }, attackTime);
                }
                if (closestObject.interactable)
                    this.interactWith(closestObject);
            }
        }
    }
    // why does this need to be static?
    static resetSpeedAfterShooting(player) {
        player.shooting = false;
        player.recalculateSpeed();
    }
    useThrowable() {
        if (this.inventory[this.activeWeapon.typeString] < 1)
            return;
        // Start throwing animation
        if (!this.anim.active) {
            this.anim.active = true;
            this.anim.type = constants_1.Constants.Anim.Throw;
            this.anim.seq = 1;
            this.anim.time = 0;
            this.fullDirtyObjects.add(this);
        }
        const proj = new projectile_1.Projectile(this.activeWeapon.typeString, this.game, this.position, this.layer, this.direction, this);
        this.game.dynamicObjects.add(proj);
        this.game.projectiles.add(proj);
        this.inventory[this.activeWeapon.typeString]--;
        this.activeWeapon.count = this.inventory[this.activeWeapon.typeString];
        this.inventoryDirty = true;
    }
    shootGun() {
        if (this.activeWeapon.ammo === 0) {
            this.shooting = false;
            this.reload();
            return;
        }
        const weaponTypeString = this.activeWeapon.typeString;
        const weapon = data_1.Weapons[weaponTypeString];
        setTimeout(() => Player.resetSpeedAfterShooting(this), weapon.fireDelay * 700); // Since RecoilTime is 1000000 on every gun in the data, approximate it with 70% of the time between shots.
        this.cancelAction();
        this.shooting = true;
        this.recalculateSpeed();
        // Get the dual offset of the weapon based on the current shooting hand
        const offset = (weapon.dualOffset * (this.lastShotHand === "right" ? 1 : -1)) || 0;
        // Fire the gun
        if (weapon.fireMode === "burst") {
            const burstCount = Math.min(weapon.burstCount, this.activeWeapon.ammo); // Makes sure burst gun won't fire more bullets than ammo it currently has
            const burstDelay = weapon.burstDelay;
            for (let i = 0; i < burstCount; i++) {
                setTimeout(() => this.spawnBullet(offset, weaponTypeString), 1000 * i * burstDelay);
            }
        }
        else {
            this.spawnBullet(offset, weaponTypeString);
        }
        // Switch firing hand for dual guns
        if (weapon.isDual) {
            if (this.lastShotHand === "right")
                this.lastShotHand = "left";
            else
                this.lastShotHand = "right";
        }
    }
    useBandage() {
        if (this.health === 100 || this.inventory.bandage === 0 || constants_1.MedTypes.includes(this.actionItem.typeString))
            return;
        this.cancelAction();
        this.doAction("bandage", 3);
    }
    useMedkit() {
        if (this.health === 100 || this.inventory.healthkit === 0 || constants_1.MedTypes.includes(this.actionItem.typeString))
            return;
        this.cancelAction();
        this.doAction("healthkit", 6);
    }
    useSoda() {
        if (this.boost === 100 || this.inventory.soda === 0 || constants_1.MedTypes.includes(this.actionItem.typeString))
            return;
        this.cancelAction();
        this.doAction("soda", 3);
    }
    usePills() {
        if (this.boost === 100 || this.inventory.painkiller === 0 || constants_1.MedTypes.includes(this.actionItem.typeString))
            return;
        this.cancelAction();
        this.doAction("painkiller", 5);
    }
    doAction(typeString, duration, actionType, skipRecalculateSpeed) {
        if (this.actionDirty || (actionType === constants_1.Constants.Action.Reload && !(this.selectedWeaponSlot === 0 || this.selectedWeaponSlot === 1)))
            return;
        this.actionItem.typeString = typeString;
        this.actionItem.typeId = data_1.TypeToId[typeString];
        this.actionItem.duration = duration;
        this.actionItem.useEnd = Date.now() + duration * 1000;
        this.actionDirty = true;
        this.actionType = actionType ?? constants_1.Constants.Action.UseItem;
        if (this.actionType === constants_1.Constants.Action.UseItem)
            this.usingItem = true;
        this.actionSeq = 1;
        if (!skipRecalculateSpeed)
            this.recalculateSpeed();
        this.game.fullDirtyObjects.add(this);
        this.fullDirtyObjects.add(this);
    }
    cancelAction() {
        if (this.actionType === constants_1.Constants.Action.UseItem) {
            this.usingItem = false;
            this.recalculateSpeed();
        }
        this.actionItem.typeString = "";
        this.actionItem.typeId = 0;
        this.actionDirty = false;
        this.actionType = 0;
        this.actionSeq = 0;
        this.game.fullDirtyObjects.add(this);
        this.fullDirtyObjects.add(this);
    }
    reload() {
        if (this.shooting || !(this.selectedWeaponSlot === 0 || this.selectedWeaponSlot === 1))
            return;
        const weaponInfo = this.activeWeaponInfo;
        if (this.activeWeapon.ammo !== weaponInfo.maxClip && this.inventory[weaponInfo.ammo] !== 0) { // ammo here refers to the TYPE of ammo used by the gun, not the quantity
            this.doAction(this.activeWeapon.typeString, weaponInfo.reloadTime, constants_1.Constants.Action.Reload, true);
        }
    }
    get health() {
        return this._health;
    }
    set health(health) {
        this._health = health;
        if (this._health > 100)
            this._health = 100;
        if (this._health < 0)
            this._health = 0;
        this.healthDirty = true;
    }
    get boost() {
        return this._boost;
    }
    set boost(boost) {
        this._boost = boost;
        if (this._boost > 100)
            this._boost = 100;
        if (this._boost < 0)
            this._boost = 0;
        this.boostDirty = true;
    }
    damage(amount, source, objectUsed, damageType = constants_1.DamageType.Player) {
        if (this._health < 0)
            this._health = 0;
        if (this.dead)
            return;
        let finalDamage = amount;
        finalDamage -= finalDamage * constants_1.Constants.chestDamageReductionPercentages[this.chestLevel];
        finalDamage -= finalDamage * constants_1.Constants.helmetDamageReductionPercentages[this.helmetLevel];
        if (this._health - finalDamage < 0)
            finalDamage += this._health - finalDamage;
        this.damageTaken += finalDamage;
        if (source instanceof Player)
            source.damageDealt += finalDamage;
        this._health -= finalDamage;
        this.healthDirty = true;
        if (this._health === 0) {
            this.dead = true;
            this.boost = 0;
            this.actionType = this.actionSeq = 0;
            this.anim.type = this.anim.seq = 0;
            // Set killedBy
            if (source instanceof Player && source !== this)
                this.killedBy = source;
            // Update role
            if (this.role === data_1.TypeToId.kill_leader) {
                this.game.roleAnnouncements.add(new roleAnnouncementPacket_1.RoleAnnouncementPacket(this, false, true, source));
                // Find a new Kill Leader
                let highestKillCount = 0;
                let highestKillsPlayer = null;
                for (const p of this.game.players) {
                    if (!p.dead && p.kills > highestKillCount) {
                        highestKillCount = p.kills;
                        highestKillsPlayer = p;
                    }
                }
                // If a new Kill Leader was found, assign the role.
                // Otherwise, leave it vacant.
                if ((highestKillsPlayer != null) && highestKillCount > 2) {
                    this.game.assignKillLeader(highestKillsPlayer);
                }
                else {
                    this.game.killLeader = { id: 0, kills: 0 };
                    this.game.killLeaderDirty = true;
                }
            }
            this.roleLost = true;
            // Decrement alive count
            if (!this.disconnected) {
                this.game.aliveCountDirty = true;
            }
            // Increment kill count for killer
            if (source instanceof Player && source !== this) {
                source.kills++;
                if (source.kills > 2 && source.kills > this.game.killLeader.kills) {
                    this.game.assignKillLeader(source);
                }
            }
            // Set static dead position
            this.deadPos = this.body.getPosition().clone();
            this.game.world.destroyBody(this.body);
            this.fullDirtyObjects.add(this);
            this.game.dynamicObjects.delete(this);
            this.game.deletedObjects.add(this);
            // Send death emote
            if (this.loadout.emotes[5] !== 0) {
                this.game.emotes.add(new misc_1.Emote(this.id, this.position, this.loadout.emotes[5], false));
            }
            // Create dead body
            const deadBody = new deadBody_1.DeadBody(this.game, this.layer, this.position, this.id);
            this.game.dynamicObjects.add(deadBody);
            this.game.fullDirtyObjects.add(deadBody);
            this.game.updateObjects = true;
            // Drop loot
            this.dropItemInSlot(0, this.weapons[0].typeString, true);
            this.dropItemInSlot(1, this.weapons[1].typeString, true);
            if (this.weapons[2].typeString !== "fists")
                this.dropItemInSlot(2, this.weapons[2].typeString, true);
            for (const item in this.inventory) {
                if (item === "1xscope")
                    continue;
                if (this.inventory[item] > 0) {
                    this.dropLoot(item);
                    this.inventory[item] = 0;
                }
            }
            if (this.helmetLevel > 0) {
                this.dropLoot(`helmet0${this.helmetLevel}`);
                this.helmetLevel = 0;
            }
            if (this.chestLevel > 0) {
                this.dropLoot(`chest0${this.chestLevel}`);
                this.chestLevel = 0;
            }
            if (this.backpackLevel > 0) {
                this.dropLoot(`backpack0${this.backpackLevel}`);
                this.backpackLevel = 0;
            }
            this.selectedWeaponSlot = 2;
            this.weaponsDirty = true;
            this.inventoryDirty = true;
            this.inventoryEmpty = true;
            // Remove from active players; send packets
            this.game.livingPlayers.delete(this);
            (0, misc_1.removeFrom)(this.game.spectatablePlayers, this);
            this.game.kills.add(new killPacket_1.KillPacket(this, damageType, source, objectUsed));
            if (!this.disconnected)
                this.sendPacket(new gameOverPacket_1.GameOverPacket(this));
            // Winning logic
            if (this.game.aliveCount <= 1) {
                if (this.game.aliveCount === 1) {
                    const lastManStanding = [...this.game.livingPlayers][0];
                    // Send game over
                    const gameOverPacket = new gameOverPacket_1.GameOverPacket(lastManStanding, true);
                    lastManStanding.sendPacket(gameOverPacket);
                    for (const spectator of lastManStanding.spectators)
                        spectator.sendPacket(gameOverPacket);
                    // End the game in 750ms
                    setTimeout(() => {
                        if (lastManStanding.loadout.emotes[4] !== 0) { // Win emote
                            this.game.emotes.add(new misc_1.Emote(lastManStanding.id, lastManStanding.position, lastManStanding.loadout.emotes[4], false));
                        }
                        this.game.end();
                    }, 750);
                }
                else {
                    setTimeout(() => this.game.end(), 750);
                }
            }
            else if (this.spectators.size !== 0) {
                let toSpectate;
                if (source instanceof Player && source !== this)
                    toSpectate = source;
                else
                    toSpectate = this.game.randomPlayer();
                for (const spectator of this.spectators) {
                    spectator.spectate(toSpectate);
                }
                this.spectators = new Set();
            }
        }
    }
    dropLoot(type) {
        /* eslint-disable-next-line no-new */
        new loot_1.Loot(this.game, type, this.deadPos, this.layer, this.inventory[type]);
    }
    recalculateSpeed() {
        this.speed = data_1.Config.movementSpeed;
        this.diagonalSpeed = data_1.Config.diagonalSpeed;
        if (this.usingItem) {
            this.speed *= 0.5;
            this.diagonalSpeed *= 0.5;
        }
        if (this.boost >= 50) {
            this.speed *= 1.15;
            this.diagonalSpeed *= 1.15;
        }
        if (this.shooting) {
            this.speed *= 0.5;
            this.diagonalSpeed *= 0.5;
        }
    }
    updateVisibleObjects() {
        this.movesSinceLastUpdate = 0;
        const approximateX = Math.round(this.position.x / 10) * 10;
        const approximateY = Math.round(this.position.y / 10) * 10;
        this.nearObjects = this.game.visibleObjects[28][approximateX][approximateY];
        const visibleAtZoom = this.game.visibleObjects[this.zoom];
        const newVisibleObjects = new Set(visibleAtZoom ? visibleAtZoom[approximateX][approximateY] : this.nearObjects);
        const minX = this.position.x - this.xCullDist;
        const minY = this.position.y - this.yCullDist;
        const maxX = this.position.x + this.xCullDist;
        const maxY = this.position.y + this.yCullDist;
        for (const object of this.game.dynamicObjects) {
            if (this === object)
                continue;
            if (object.position.x > minX &&
                object.position.x < maxX &&
                object.position.y > minY &&
                object.position.y < maxY) {
                newVisibleObjects.add(object);
                if (!this.visibleObjects.has(object)) {
                    this.fullDirtyObjects.add(object);
                }
                if (object instanceof Player && !object.visibleObjects.has(this)) {
                    object.visibleObjects.add(this);
                    object.fullDirtyObjects.add(this);
                }
            }
            else {
                if (this.visibleObjects.has(object)) {
                    this.deletedObjects.add(object);
                }
            }
        }
        for (const object of newVisibleObjects) {
            if (!this.visibleObjects.has(object)) {
                this.fullDirtyObjects.add(object);
            }
        }
        for (const object of this.visibleObjects) {
            if (!newVisibleObjects.has(object)) {
                this.deletedObjects.add(object);
            }
        }
        this.visibleObjects = newVisibleObjects;
    }
    spectate(spectating) {
        if (spectating == null) {
            this.socket.close();
            this.game.removePlayer(this);
            return;
        }
        this.isSpectator = true;
        if (this.spectating != null) {
            this.spectating.spectators.delete(this);
            this.spectating.spectatorCountDirty = true;
        }
        this.spectating = spectating;
        spectating.spectators.add(this);
        spectating.healthDirty = true;
        spectating.boostDirty = true;
        spectating.zoomDirty = true;
        spectating.weaponsDirty = true;
        spectating.inventoryDirty = true;
        spectating.activePlayerIdDirty = true;
        spectating.spectatorCountDirty = true;
        spectating.updateVisibleObjects();
        for (const object of spectating.visibleObjects) {
            spectating.fullDirtyObjects.add(object);
        }
        spectating.fullDirtyObjects.add(spectating);
        if (spectating.partialDirtyObjects.size)
            spectating.partialDirtyObjects = new Set();
        spectating.fullUpdate = true;
    }
    isOnOtherSide(door) {
        switch (door.orientation) {
            case 0: return this.position.x < door.position.x;
            case 1: return this.position.y < door.position.y;
            case 2: return this.position.x > door.position.x;
            case 3: return this.position.y > door.position.y;
        }
        return false;
    }
    sendPacket(packet) {
        const stream = survivBitStream_1.SurvivBitStream.alloc(packet.allocBytes);
        try {
            packet.serialize(stream);
        }
        catch (e) {
            console.error("Error serializing packet. Details:", e);
        }
        this.sendData(stream);
    }
    sendData(stream) {
        try {
            this.socket.send(stream.buffer.subarray(0, Math.ceil(stream.index / 8)), true, true);
        }
        catch (e) {
            console.warn("Error sending packet. Details:", e);
        }
    }
    get buildingZoom() {
        return this._buildingZoom;
    }
    set buildingZoom(value) {
        if (this._zoom === value)
            return;
        this._buildingZoom = value;
        this.scopeToResetTo = this.scope.typeString;
        if (this._buildingZoom !== 0) {
            this.zoom = this._buildingZoom;
        }
        else if (this.wasInBuildingAsOfLastCheck) {
            if (this.isMobile)
                this.zoom = constants_1.Constants.scopeZoomRadius.mobile[this.scopeToResetTo];
            else
                this.zoom = constants_1.Constants.scopeZoomRadius.desktop[this.scopeToResetTo];
        }
        if (this._buildingZoom === 0) {
            this.wasInBuildingAsOfLastCheck = false;
        }
        else {
            this.wasInBuildingAsOfLastCheck = true;
        }
    }
    interactWith(object) {
        if (object instanceof obstacle_1.Obstacle && Date.now() - this.lastObstacleInteractionTime > 100) {
            object.interact(this);
            this.lastObstacleInteractionTime = Date.now();
        }
        else if (object instanceof loot_1.Loot && Date.now() - this.lastLootInteractionTime > 25) {
            object.interact(this);
            this.lastLootInteractionTime = Date.now();
        }
    }
    serializePartial(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
        stream.writeUnitVec(this.direction, 8);
    }
    serializeFull(stream) {
        stream.writeGameType(this.loadout.outfit);
        stream.writeGameType(constants_1.Constants.BasePack + this.backpackLevel);
        stream.writeGameType(this.helmetLevel === 0 ? 0 : constants_1.Constants.BaseHelmet + this.helmetLevel); // Helmet
        stream.writeGameType(this.chestLevel === 0 ? 0 : constants_1.Constants.BaseChest + this.chestLevel); // Vest
        stream.writeGameType(this.activeWeapon.typeId);
        stream.writeBits(this.layer, 2);
        stream.writeBoolean(this.dead);
        stream.writeBoolean(this.downed);
        stream.writeBits(this.anim.type, 3);
        stream.writeBits(this.anim.seq, 3);
        stream.writeBits(this.actionType, 3);
        stream.writeBits(this.actionSeq, 3);
        stream.writeBoolean(false); // Wearing pan
        stream.writeBoolean(false); // Indoors
        stream.writeBoolean(false); // Gun loaded
        stream.writeBoolean(false); // Heal effect?
        stream.writeBits(0, 2); // Unknown bits
        stream.writeBoolean(this.actionItem.typeId !== 0);
        if (this.actionItem.typeId !== 0) {
            stream.writeGameType(this.actionItem.typeId);
        }
        stream.writeBoolean(false); // Scale dirty
        stream.writeBoolean(false); // Perks dirty
        stream.writeAlignToNextByte();
    }
}
exports.Player = Player;
//# sourceMappingURL=player.js.map