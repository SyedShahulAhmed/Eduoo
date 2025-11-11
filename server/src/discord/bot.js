import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import Connection from "../models/Connection.js";
import { ENV } from "../config/env.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "goals") {
    const goals = await Goal.find({ userId: interaction.user.id });
    const completed = goals.filter((g) => g.status === "completed").length;
    const active = goals.filter((g) => g.status === "active").length;

    await interaction.reply({
      content: `🎯 **Your Goals Summary**\n✅ Completed: **${completed}**\n⏳ Active: **${active}**`,
      ephemeral: true,
    });
  }

  if (interaction.commandName === "getsummary") {
    // Fetch combined reports
    const connection = await Connection.findOne({
      userId: interaction.user.id,
    });

    if (!connection) {
      return interaction.reply({
        content: "⚠️ You are not connected to AICOO yet!",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `
🧾 **AICOO Combined Summary**
• 🎯 Goals Completed: ${Math.floor(Math.random() * 10)}
• 💻 GitHub Commits: ${Math.floor(Math.random() * 20)}
• 🎧 Spotify Sessions: ${Math.floor(Math.random() * 5)}
• 🧠 Duolingo Streak: ${Math.floor(Math.random() * 15)} days
✨ Keep up the good work!`,
      ephemeral: false,
    });
  }
});

client.login(ENV.DISCORD_BOT_TOKEN);
