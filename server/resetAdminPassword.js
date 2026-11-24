import dns from "node:dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const adminEmail = "avinayaka3721@gmail.com";
    const newPassword = "Avinay@#$3827CivicSignal";

    const admin = await User.findOne({
      email: adminEmail.toLowerCase(),
      role: "admin",
    });

    if (!admin) {
      console.log("Admin account not found.");
      return;
    }

    // User.js automatically hashes the password before saving.
    admin.password = newPassword;
    await admin.save();

    console.log("Admin password reset successfully!");
  } catch (error) {
    console.error("Password reset failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();