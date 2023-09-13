"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.game = exports.app = void 0;
const uWebSockets_js_1 = require("uWebSockets.js");
const cookie_1 = __importDefault(require("cookie"));
const game_1 = require("./game/game");
const inputPacket_1 = require("./packets/receiving/inputPacket");
const emotePacket_1 = require("./packets/receiving/emotePacket");
const joinPacket_1 = require("./packets/receiving/joinPacket");
const dropItemPacket_1 = require("./packets/receiving/dropItemPacket");
const spectatePacket_1 = require("./packets/receiving/spectatePacket");
const misc_1 = require("./utils/misc");
const constants_1 = require("./utils/constants");
const data_1 = require("./utils/data");
const survivBitStream_1 = require("./utils/survivBitStream");
// Initialize the game.
let game = new game_1.Game();
exports.game = game;
// Initialize the server.
const app = data_1.Config.webSocketHttps
    ? (0, uWebSockets_js_1.SSLApp)({
        key_file_name: data_1.Config.keyFile,
        cert_file_name: data_1.Config.certFile
    })
    : (0, uWebSockets_js_1.App)();
exports.app = app;
// Bot protection.
const playerCounts = new Map();
const connectionAttempts = new Map();
const bannedIPs = [];
app.get("/", (res) => {
    res.writeStatus("302");
    res.writeHeader("Location", `http${data_1.Config.https ? "s" : ""}://${data_1.Config.host}`);
    res.end();
});
app.ws("/play", {
    compression: uWebSockets_js_1.DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,
    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        res.onAborted(() => { });
        // Start a new game if the old one is over.
        if (game.over)
            exports.game = game = new game_1.Game();
        if (data_1.Config.botProtection) {
            const ip = req.getHeader("cf-connecting-ip");
            if (ip !== undefined && ip.length > 0) {
                if (!bannedIPs.includes(ip))
                    return res.endWithoutBody(0, true);
                const playerIPCount = playerCounts.get(ip);
                const recentIPCount = connectionAttempts.get(ip);
                if (playerIPCount !== undefined && recentIPCount !== undefined) {
                    if (bannedIPs.includes(ip) || playerIPCount > 5 || recentIPCount > 40) {
                        if (!bannedIPs.includes(ip))
                            bannedIPs.push(ip);
                        (0, misc_1.log)(`[IP BLOCK]: ${ip}`);
                        return res.endWithoutBody(0, true);
                    }
                }
                playerCounts.set(ip, (playerIPCount ?? 0) + 1);
                connectionAttempts.set(ip, (recentIPCount ?? 0) + 1);
                (0, misc_1.log)(`[${ip}] Concurrent connections: ${playerCounts.get(ip) ?? 0}.`);
                (0, misc_1.log)(`[${ip}] Connections in last 30 seconds: ${connectionAttempts.get(ip) ?? 0}.`);
            }
            res.upgrade({
                cookies: cookie_1.default.parse(req.getHeader("cookie")),
                ip
            }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-weboscket-extensions"), context);
        }
        else {
            res.upgrade({
                cookies: cookie_1.default.parse(req.getHeader("cookie"))
            }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
        }
    },
    /**
     * Handle opening of the socket.
     * @param socket The socket being opened.
     */
    open: (socket) => {
        let playerName = socket.cookies["player-name"]?.trim().substring(0, 16) ?? "Player";
        if (typeof playerName !== "string" || playerName.length < 1)
            playerName = "Player";
        (0, misc_1.log)(`"${playerName}" joined the game.`);
        let loadout = {};
        try {
            loadout = JSON.parse(socket.cookies.loadout);
        }
        catch {
            loadout = {};
        }
        socket.player = game.addPlayer(socket, playerName, loadout);
    },
    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message: (socket, message) => {
        const stream = new survivBitStream_1.SurvivBitStream(message);
        try {
            const msgType = stream.readUint8();
            switch (msgType) {
                case constants_1.MsgType.Input:
                    new inputPacket_1.InputPacket(socket.player).deserialize(stream);
                    break;
                case constants_1.MsgType.DropItem:
                    new dropItemPacket_1.DropItemPacket(socket.player).deserialize(stream);
                    break;
                case constants_1.MsgType.Emote:
                    new emotePacket_1.EmotePacket(socket.player).deserialize(stream);
                    break;
                case constants_1.MsgType.Join:
                    new joinPacket_1.JoinPacket(socket.player).deserialize(stream);
                    break;
                case constants_1.MsgType.Spectate:
                    new spectatePacket_1.SpectatePacket(socket.player).deserialize(stream);
                    break;
            }
        }
        catch (e) {
            console.warn("Error parsing message:", e);
        }
    },
    /**
     * Handle closing of the socket.
     * @param socket The socket being closed.
     */
    close: (socket) => {
        if (data_1.Config.botProtection)
            playerCounts.set(socket.ip, (playerCounts.get(socket.ip) ?? 0) - 1);
        (0, misc_1.log)(`"${socket.player.name}" left the game.`);
        game.removePlayer(socket.player);
    }
});
process.stdout.on("end", () => {
    (0, misc_1.log)("WebSocket server shutting down...");
    game?.end();
    process.exit();
});
app.listen(data_1.Config.webSocketHost, data_1.Config.webSocketPort, () => {
    (0, misc_1.log)(`WebSocket server listening on ${data_1.Config.webSocketHost}:${data_1.Config.webSocketPort}`);
    (0, misc_1.log)("Press Ctrl+C to exit.");
});
// Clear connection attempts every 30 seconds.
if (data_1.Config.botProtection) {
    setInterval(() => {
        connectionAttempts.clear();
    }, 3e4);
}
//# sourceMappingURL=webSocketServer.js.map