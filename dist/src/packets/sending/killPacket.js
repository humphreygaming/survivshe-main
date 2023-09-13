"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillPacket = void 0;
const sendingPacket_1 = require("../sendingPacket");
const constants_1 = require("../../utils/constants");
class KillPacket extends sendingPacket_1.SendingPacket {
    damageType;
    killer;
    killedWith;
    constructor(p, damageType, killer, killedWith) {
        super(p);
        this.damageType = damageType;
        this.killer = killer;
        this.killedWith = killedWith;
        this.msgType = constants_1.MsgType.Kill;
        this.allocBytes = 32;
    }
    serialize(stream) {
        super.serialize(stream);
        stream.writeUint8(this.damageType); // Damage type
        stream.writeGameType((this.killedWith && !this.killedWith.isObstacle) ? this.killedWith.typeId : 0); // Item source type
        stream.writeMapType((this.killedWith?.isObstacle) ? this.killedWith.typeId : 0); // Map source type
        stream.writeUint16(this.p.id); // Target ID
        stream.writeUint16(this.killer?.id ?? 0); // Killer ID
        stream.writeUint16(this.killer?.id ?? 0); // Kill credit ID
        stream.writeUint8(this.killer?.kills ?? 0); // Killer kills
        stream.writeBoolean(false); // Downed
        stream.writeBoolean(true); // Killed
        stream.writeAlignToNextByte();
    }
}
exports.KillPacket = KillPacket;
//# sourceMappingURL=killPacket.js.map