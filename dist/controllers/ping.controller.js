"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PingController = void 0;
const inversify_1 = require("inversify");
const base_controller_1 = require("./base.controller");
const inversify_2 = require("inversify");
let PingController = class PingController extends base_controller_1.BaseController {
    constructor(container) {
        super(container);
    }
    /**
     * @swagger
     * /api/v2/ping:
     *   get:
     *     summary: Test if the server is running
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: Server is running
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: pong
     */
    async ping(req, res) {
        res.json({ message: 'pong' });
    }
};
exports.PingController = PingController;
exports.PingController = PingController = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [inversify_2.Container])
], PingController);
//# sourceMappingURL=ping.controller.js.map