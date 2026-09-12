"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting Database Seeding...');
    // Clear existing data in reverse order of foreign keys
    await prisma.activityLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🧹 Cleared existing database tables.');
    const passwordHash = await bcryptjs_1.default.hash('Password123!', 10);
    // 1. Create Users
    // 1 Admin, 2 Project Managers, 4 Developers
    const admin = await prisma.user.create({
        data: {
            email: 'admin@agency.com',
            passwordHash,
            name: 'Elena Vance (Admin)',
            role: client_1.Role.ADMIN,
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
    });
    const pm1 = await prisma.user.create({
        data: {
            email: 'pm1@agency.com',
            passwordHash,
            name: 'Alex Mercer (PM)',
            role: client_1.Role.PROJECT_MANAGER,
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        },
    });
    const pm2 = await prisma.user.create({
        data: {
            email: 'pm2@agency.com',
            passwordHash,
            name: 'Sarah Connor (PM)',
            role: client_1.Role.PROJECT_MANAGER,
            avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        },
    });
    const dev1 = await prisma.user.create({
        data: {
            email: 'dev1@agency.com',
            passwordHash,
            name: 'Ravi Kumar (Dev)',
            role: client_1.Role.DEVELOPER,
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        },
    });
    const dev2 = await prisma.user.create({
        data: {
            email: 'dev2@agency.com',
            passwordHash,
            name: 'Marcus Chen (Dev)',
            role: client_1.Role.DEVELOPER,
            avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        },
    });
    const dev3 = await prisma.user.create({
        data: {
            email: 'dev3@agency.com',
            passwordHash,
            name: 'Aisha Patel (Dev)',
            role: client_1.Role.DEVELOPER,
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        },
    });
    const dev4 = await prisma.user.create({
        data: {
            email: 'dev4@agency.com',
            passwordHash,
            name: 'Leo Rodriguez (Dev)',
            role: client_1.Role.DEVELOPER,
            avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        },
    });
    console.log('✅ Created 7 Users (1 Admin, 2 PMs, 4 Devs)');
    // 2. Create Clients
    const client1 = await prisma.client.create({
        data: {
            name: 'Acme Global Corporation',
            company: 'Acme Corp',
            email: 'contact@acme.com',
        },
    });
    const client2 = await prisma.client.create({
        data: {
            name: 'Nova Dynamics Tech',
            company: 'Nova Dynamics',
            email: 'partners@novadynamics.io',
        },
    });
    const client3 = await prisma.client.create({
        data: {
            name: 'Stellar Stream Media',
            company: 'Stellar Media',
            email: 'support@stellarmedia.com',
        },
    });
    console.log('✅ Created 3 Clients');
    // 3. Create Projects (At least 3 projects)
    // Project 1 managed by PM1 (Alex)
    const project1 = await prisma.project.create({
        data: {
            name: 'E-Commerce Cloud Replatform',
            description: 'Modernizing legacy e-commerce storefront to headless Next.js & microservices.',
            clientId: client1.id,
            managerId: pm1.id,
            status: client_1.ProjectStatus.ACTIVE,
        },
    });
    // Project 2 managed by PM1 (Alex)
    const project2 = await prisma.project.create({
        data: {
            name: 'Nova AI Analytics Hub',
            description: 'Real-time telemetry and LLM-assisted workflow automation dashboard.',
            clientId: client2.id,
            managerId: pm1.id,
            status: client_1.ProjectStatus.ACTIVE,
        },
    });
    // Project 3 managed by PM2 (Sarah)
    const project3 = await prisma.project.create({
        data: {
            name: 'Stellar Video Streaming App',
            description: 'Cross-platform mobile streaming app with offline download sync.',
            clientId: client3.id,
            managerId: pm2.id,
            status: client_1.ProjectStatus.ACTIVE,
        },
    });
    console.log('✅ Created 3 Projects across PM1 and PM2');
    const now = new Date();
    const pastDate2Days = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const pastDate5Days = new Date(now.getTime() - 120 * 60 * 60 * 1000);
    const futureDate2Days = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const futureDate5Days = new Date(now.getTime() + 120 * 60 * 60 * 1000);
    const futureDate10Days = new Date(now.getTime() + 240 * 60 * 60 * 1000);
    // 4. Create Tasks for Project 1 (6 tasks, including 1 overdue)
    const t1_1 = await prisma.task.create({
        data: {
            title: 'Architect PostgreSQL Data Migration Schema',
            description: 'Design zero-downtime database migration strategy from MongoDB to PostgreSQL.',
            projectId: project1.id,
            assignedToId: dev1.id, // Ravi
            status: client_1.TaskStatus.IN_PROGRESS,
            priority: client_1.Priority.CRITICAL,
            dueDate: futureDate2Days,
        },
    });
    const t1_2 = await prisma.task.create({
        data: {
            title: 'Implement OAuth2 & Refresh Token Rotation',
            description: 'Ensure refresh tokens are saved in HttpOnly cookie with server revocation.',
            projectId: project1.id,
            assignedToId: dev1.id, // Ravi
            status: client_1.TaskStatus.IN_REVIEW,
            priority: client_1.Priority.HIGH,
            dueDate: futureDate5Days,
        },
    });
    // OVERDUE TASK 1
    const t1_3 = await prisma.task.create({
        data: {
            title: 'Audit Stripe Checkout Webhook Handlers',
            description: 'Fix race conditions in idempotency keys during simultaneous checkout attempts.',
            projectId: project1.id,
            assignedToId: dev2.id, // Marcus
            status: client_1.TaskStatus.TODO,
            priority: client_1.Priority.CRITICAL,
            dueDate: pastDate2Days,
            isOverdue: true,
        },
    });
    const t1_4 = await prisma.task.create({
        data: {
            title: 'Configure Redis Cart Cache Cluster',
            description: 'Set up automatic session invalidation and TTL for abandoned carts.',
            projectId: project1.id,
            assignedToId: dev2.id, // Marcus
            status: client_1.TaskStatus.DONE,
            priority: client_1.Priority.MEDIUM,
            dueDate: futureDate5Days,
        },
    });
    const t1_5 = await prisma.task.create({
        data: {
            title: 'Setup Algolia Product Search Indexing',
            description: 'Stream catalog updates via database triggers to Algolia index.',
            projectId: project1.id,
            assignedToId: dev3.id, // Aisha
            status: client_1.TaskStatus.TODO,
            priority: client_1.Priority.LOW,
            dueDate: futureDate10Days,
        },
    });
    const t1_6 = await prisma.task.create({
        data: {
            title: 'Responsive Cart Drawer Micro-interactions',
            description: 'Build framer-motion powered cart slide-over with swipe-to-remove gesture.',
            projectId: project1.id,
            assignedToId: dev4.id, // Leo
            status: client_1.TaskStatus.IN_PROGRESS,
            priority: client_1.Priority.MEDIUM,
            dueDate: futureDate2Days,
        },
    });
    // Tasks for Project 2 (6 tasks, including 1 overdue)
    // OVERDUE TASK 2
    const t2_1 = await prisma.task.create({
        data: {
            title: 'Fine-tune LangChain Prompt Pipeline',
            description: 'Reduce token latency and handle output guardrail parsing errors gracefully.',
            projectId: project2.id,
            assignedToId: dev1.id, // Ravi
            status: client_1.TaskStatus.IN_PROGRESS,
            priority: client_1.Priority.CRITICAL,
            dueDate: pastDate5Days,
            isOverdue: true,
        },
    });
    const t2_2 = await prisma.task.create({
        data: {
            title: 'Vector Embeddings pgvector Integration',
            description: 'Store HNSW indexed document embeddings for fast semantic similarity search.',
            projectId: project2.id,
            assignedToId: dev2.id, // Marcus
            status: client_1.TaskStatus.IN_REVIEW,
            priority: client_1.Priority.HIGH,
            dueDate: futureDate2Days,
        },
    });
    const t2_3 = await prisma.task.create({
        data: {
            title: 'WebSocket Live Telemetry Feed',
            description: 'Stream pipeline execution logs directly to the dashboard in real time.',
            projectId: project2.id,
            assignedToId: dev3.id, // Aisha
            status: client_1.TaskStatus.DONE,
            priority: client_1.Priority.HIGH,
            dueDate: futureDate5Days,
        },
    });
    const t2_4 = await prisma.task.create({
        data: {
            title: 'Anomaly Detection Threshold Alerter',
            description: 'Alert on-call engineers when error rate exceeds 3 standard deviations.',
            projectId: project2.id,
            assignedToId: dev3.id, // Aisha
            status: client_1.TaskStatus.TODO,
            priority: client_1.Priority.MEDIUM,
            dueDate: futureDate10Days,
        },
    });
    const t2_5 = await prisma.task.create({
        data: {
            title: 'Implement Export to CSV and Parquet',
            description: 'Stream large data exports with low memory footprint using Node.js Transform streams.',
            projectId: project2.id,
            assignedToId: dev4.id, // Leo
            status: client_1.TaskStatus.TODO,
            priority: client_1.Priority.LOW,
            dueDate: futureDate10Days,
        },
    });
    const t2_6 = await prisma.task.create({
        data: {
            title: 'Dark Mode Glassmorphic Charts',
            description: 'Design high-framerate Canvas charts for latency benchmarks.',
            projectId: project2.id,
            assignedToId: dev4.id, // Leo
            status: client_1.TaskStatus.IN_PROGRESS,
            priority: client_1.Priority.MEDIUM,
            dueDate: futureDate5Days,
        },
    });
    // Tasks for Project 3 (Project Manager: Sarah) (6 tasks, including 1 overdue)
    // OVERDUE TASK 3
    const t3_1 = await prisma.task.create({
        data: {
            title: 'DRM License Server Integration (Widevine/FairPlay)',
            description: 'Key exchange and secure media pipeline decryption for encrypted HLS streams.',
            projectId: project3.id,
            assignedToId: dev3.id, // Aisha
            status: client_1.TaskStatus.TODO,
            priority: client_1.Priority.CRITICAL,
            dueDate: pastDate2Days,
            isOverdue: true,
        },
    });
    const t3_2 = await prisma.task.create({
        data: {
            title: 'Adaptive Bitrate HLS Chunk Packaging',
            description: 'Benchmark ffmpeg transcode ladders for 1080p60 and 4K HDR profiles.',
            projectId: project3.id,
            assignedToId: dev3.id, // Aisha
            status: client_1.TaskStatus.IN_PROGRESS,
            priority: client_1.Priority.HIGH,
            dueDate: futureDate2Days,
        },
    });
    const t3_3 = await prisma.task.create({
        data: {
            title: 'Offline Video Encryption & SQLite Storage',
            description: 'Safely encrypt downloaded chunks on device with AES-256-GCM.',
            projectId: project3.id,
            assignedToId: dev4.id, // Leo
            status: client_1.TaskStatus.IN_REVIEW,
            priority: client_1.Priority.HIGH,
            dueDate: futureDate5Days,
        },
    });
    const t3_4 = await prisma.task.create({
        data: {
            title: 'Subtitles & Closed Captioning VTT Parser',
            description: 'Auto-sync multilingual WebVTT subtitles with audio track cues.',
            projectId: project3.id,
            assignedToId: dev4.id, // Leo
            status: client_1.TaskStatus.DONE,
            priority: client_1.Priority.MEDIUM,
            dueDate: futureDate5Days,
        },
    });
    const t3_5 = await prisma.task.create({
        data: {
            title: 'Picture-in-Picture & Background Audio Playback',
            description: 'Support native OS media controls and PiP transitions.',
            projectId: project3.id,
            assignedToId: dev2.id, // Marcus
            status: client_1.TaskStatus.TODO,
            priority: client_1.Priority.LOW,
            dueDate: futureDate10Days,
        },
    });
    const t3_6 = await prisma.task.create({
        data: {
            title: 'Bandwidth Estimation Quality Switcher',
            description: 'Dynamic bitrate adjustment based on live network round-trip time and buffer fullness.',
            projectId: project3.id,
            assignedToId: dev1.id, // Ravi
            status: client_1.TaskStatus.IN_PROGRESS,
            priority: client_1.Priority.MEDIUM,
            dueDate: futureDate5Days,
        },
    });
    console.log('✅ Created 18 Tasks (6 per project, 3 in overdue state)');
    // 5. Pre-existing Activity Logs
    // Formatted exact prompt requirement: "Ravi moved Task #12 from In Progress → In Review · 2 mins ago"
    const activities = [
        {
            projectId: project1.id,
            taskId: t1_2.id,
            userId: dev1.id,
            action: 'TASK_STATUS_CHANGED',
            previousState: 'IN_PROGRESS',
            newState: 'IN_REVIEW',
            message: `${dev1.name} moved Task #${t1_2.taskNumber} from In Progress → In Review`,
            createdAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
        },
        {
            projectId: project2.id,
            taskId: t2_2.id,
            userId: dev2.id,
            action: 'TASK_STATUS_CHANGED',
            previousState: 'IN_PROGRESS',
            newState: 'IN_REVIEW',
            message: `${dev2.name} moved Task #${t2_2.taskNumber} from In Progress → In Review`,
            createdAt: new Date(now.getTime() - 22 * 60 * 1000), // 22 mins ago
        },
        {
            projectId: project1.id,
            taskId: t1_4.id,
            userId: dev2.id,
            action: 'TASK_STATUS_CHANGED',
            previousState: 'IN_REVIEW',
            newState: 'DONE',
            message: `${dev2.name} moved Task #${t1_4.taskNumber} from In Review → Done`,
            createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        },
        {
            projectId: project3.id,
            taskId: t3_4.id,
            userId: dev4.id,
            action: 'TASK_STATUS_CHANGED',
            previousState: 'IN_REVIEW',
            newState: 'DONE',
            message: `${dev4.name} moved Task #${t3_4.taskNumber} from In Review → Done`,
            createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
        },
        {
            projectId: project1.id,
            taskId: t1_1.id,
            userId: dev1.id,
            action: 'TASK_STATUS_CHANGED',
            previousState: 'TODO',
            newState: 'IN_PROGRESS',
            message: `${dev1.name} moved Task #${t1_1.taskNumber} from To Do → In Progress`,
            createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        },
        {
            projectId: project2.id,
            taskId: t2_1.id,
            userId: pm1.id,
            action: 'TASK_OVERDUE',
            message: `Task #${t2_1.taskNumber} ("${t2_1.title}") flagged as Overdue by System Scheduler`,
            createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        },
        {
            projectId: project3.id,
            taskId: t3_1.id,
            userId: pm2.id,
            action: 'TASK_OVERDUE',
            message: `Task #${t3_1.taskNumber} ("${t3_1.title}") flagged as Overdue by System Scheduler`,
            createdAt: new Date(now.getTime() - 16 * 60 * 60 * 1000), // 16 hours ago
        },
        {
            projectId: project1.id,
            taskId: t1_3.id,
            userId: pm1.id,
            action: 'TASK_OVERDUE',
            message: `Task #${t1_3.taskNumber} ("${t1_3.title}") flagged as Overdue by System Scheduler`,
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
        {
            projectId: project1.id,
            userId: pm1.id,
            action: 'PROJECT_CREATED',
            message: `${pm1.name} created new project "${project1.name}" for client ${client1.name}`,
            createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
        },
        {
            projectId: project3.id,
            userId: pm2.id,
            action: 'PROJECT_CREATED',
            message: `${pm2.name} created new project "${project3.name}" for client ${client3.name}`,
            createdAt: new Date(now.getTime() - 40 * 60 * 60 * 1000),
        },
    ];
    for (const act of activities) {
        await prisma.activityLog.create({ data: act });
    }
    console.log(`✅ Seeded ${activities.length} Activity Log entries spanning the last 48 hours`);
    // 6. Pre-seed Notifications
    await prisma.notification.create({
        data: {
            userId: pm1.id,
            title: 'Task Ready for Review',
            message: `${dev1.name} moved Task #${t1_2.taskNumber} ("${t1_2.title}") to In Review`,
            link: `/tasks?projectId=${project1.id}`,
            isRead: false,
        },
    });
    await prisma.notification.create({
        data: {
            userId: dev1.id,
            title: 'New Task Assigned',
            message: `${pm1.name} assigned you Task #${t1_1.taskNumber}: "${t1_1.title}" in project "${project1.name}"`,
            link: `/tasks?projectId=${project1.id}`,
            isRead: false,
        },
    });
    await prisma.notification.create({
        data: {
            userId: dev2.id,
            title: 'Task Overdue Alert',
            message: `Task #${t1_3.taskNumber} ("${t1_3.title}") has passed its due date and is now Overdue`,
            link: `/tasks?projectId=${project1.id}`,
            isRead: false,
        },
    });
    console.log('✅ Seeded initial Notifications');
    console.log('🎉 Seeding successfully completed!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
