"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Projectile = void 0;
const constants_1 = require("../../utils/constants");
const data_1 = require("../../utils/data");
const gameObject_1 = require("../gameObject");
const planck_1 = require("planck");
const explosion_1 = require("../explosion");
class Projectile extends gameObject_1.GameObject {
    kind = constants_1.ObjectKind.Projectile;
    zPos = 2;
    direction;
    data;
    body;
    isPlayer = false;
    isObstacle = false;
    isBullet = false;
    isLoot = false;
    isProjectile = true;
    player;
    collidesWith = {
        player: false,
        obstacle: true,
        bullet: false,
        loot: false,
        projectile: false
    };
    constructor(typeString, game, position, layer, direction, player) {
        super(game, typeString, position, layer);
        this.direction = direction;
        this.player = player;
        this.data = data_1.Weapons[this.typeString];
        this.body = this.game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true,
            linearDamping: 0.0005,
            linearVelocity: this.direction.clone().mul((this.data.throwPhysics.speed / 1000))
        });
        this.body.createFixture({
            shape: (0, planck_1.Circle)(0.5),
            restitution: 0.5,
            density: 0.0,
            friction: 0.0,
            userData: this
        });
        setTimeout(() => {
            this.explode();
        }, this.data.fuseTime * 1000);
    }
    update() {
        if (this.zPos > 0) {
            this.zPos -= 0.05;
            this.game.partialDirtyObjects.add(this);
        }
        if (this.position.x !== this.body.getPosition().x || this.position.y !== this.body.getPosition().y) {
            this._position = this.body.getPosition().clone();
            this.game.partialDirtyObjects.add(this);
        }
    }
    explode() {
        this.game.explosions.add(new explosion_1.Explosion(this.position, this.data.explosionType, this.layer, this.player, this));
        this.game.projectiles.delete(this);
        this.game.dynamicObjects.delete(this);
        this.game.deletedObjects.add(this);
        this.game.world.destroyBody(this.body);
    }
    serializePartial(stream) {
        stream.writeVec(this.position, 0, 0, 1024, 1024, 16);
        stream.writeFloat(this.zPos, 0, constants_1.Constants.projectile.maxHeight, 10);
        stream.writeUnitVec(this.direction, 7);
    }
    serializeFull(stream) {
        stream.writeGameType(this.typeId);
        stream.writeBits(this.layer, 2);
        stream.writeBits(0, 4); // padding
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    damage(amount, source) { }
}
exports.Projectile = Projectile;
//# sourceMappingURL=projectile.js.map