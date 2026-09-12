"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllUsers = exports.listDevelopers = void 0;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const client_1 = require("@prisma/client");
const listDevelopers = async (req, res, next) => {
    try {
        const developers = await database_1.prisma.user.findMany({
            where: { role: client_1.Role.DEVELOPER },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
            },
            orderBy: { name: 'asc' },
        });
        return (0, response_1.sendSuccess)(res, developers);
    }
    catch (error) {
        next(error);
    }
};
exports.listDevelopers = listDevelopers;
const listAllUsers = async (req, res, next) => {
    try {
        const users = await database_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                _count: {
                    select: {
                        assignedTasks: true,
                        projectsManaged: true,
                    },
                },
            },
            orderBy: [{ role: 'asc' }, { name: 'asc' }],
        });
        return (0, response_1.sendSuccess)(res, users);
    }
    catch (error) {
        next(error);
    }
};
exports.listAllUsers = listAllUsers;
