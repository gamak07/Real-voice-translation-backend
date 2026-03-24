import { prisma } from "../lib/prisma";

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("Database connected");
    } catch (error) {
        console.error("Database connection error", error);
        process.exit(1);
    }
}

const disconnectDB = async () => {
    try {
        await prisma.$disconnect();
        console.log("Database disconnected");
    } catch (error) {
        console.error("Database disconnection error", error);   
        process.exit(1);
    }
}

export { prisma, connectDB, disconnectDB };