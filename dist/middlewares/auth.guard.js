"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const inversify_1 = require("inversify");
const jsonwebtoken_1 = require("jsonwebtoken");
const response_utility_1 = require("../utilities/response.utility");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
let AuthGuard = class AuthGuard {
    verify() {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    response_utility_1.ResponseUtil.error(res, 'No token provided', 401);
                    return;
                }
                const [, token] = authHeader.split(' ');
                if (!token) {
                    response_utility_1.ResponseUtil.error(res, 'Invalid token format', 401);
                    return;
                }
                const decoded = (0, jsonwebtoken_1.verify)(token, JWT_SECRET);
                req.user = {
                    id: decoded.id,
                    role: decoded.role
                };
                next();
            }
            catch (error) {
                response_utility_1.ResponseUtil.error(res, 'Invalid token', 401);
                return;
            }
        });
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, inversify_1.injectable)()
], AuthGuard);
