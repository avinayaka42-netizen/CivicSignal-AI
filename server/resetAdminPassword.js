
import dns from "node:dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Admin environment variables are missing.");
    }

    const admin = await User.findOne({
      email: ADMIN_EMAIL.toLowerCase(),
      role: "admin",
    });

    if (!admin) {
      console.log("Admin account not found.");
      return;
    }

    admin.password = ADMIN_PASSWORD;
    await admin.save();

    console.log("Admin password reset successfully!");
  } catch (error) {
    console.error("Password reset failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();
