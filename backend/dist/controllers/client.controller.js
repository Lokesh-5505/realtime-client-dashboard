"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = exports.listClients = exports.createClientSchema = void 0;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const zod_1 = require("zod");
exports.createClientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    company: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
});
const listClients = async (req, res, next) => {
    try {
        const clients = await database_1.prisma.client.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { projects: true },
                },
            },
        });
        return (0, response_1.sendSuccess)(res, clients);
    }
    catch (error) {
        next(error);
    }
};
exports.listClients = listClients;
const createClient = async (req, res, next) => {
    try {
        const { name, company, email } = req.body;
        const existing = await database_1.prisma.client.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existing) {
            return (0, response_1.sendError)(res, 'A client with this email already exists', 409, 'DUPLICATE_CLIENT');
        }
        const client = await database_1.prisma.client.create({
            data: {
                name,
                company,
                email: email.toLowerCase(),
            },
        });
        return (0, response_1.sendSuccess)(res, client, 'Client created', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createClient = createClient;
