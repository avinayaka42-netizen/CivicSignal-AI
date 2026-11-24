import dns from "node:dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Admin environment variables are missing.");
    }

    const existingUser = await User.findOne({
      email: ADMIN_EMAIL.toLowerCase(),
    });

    if (existingUser) {
      console.log("An account with this email already exists. No changes made.");
      return;
    }

    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
    });

    console.log("Admin account created successfully!");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();