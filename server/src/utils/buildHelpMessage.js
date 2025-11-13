export const buildHelpMessage = () => {
  const embed = {
    color: 0x5865f2,
    title: "🧭 Eduoo • AICOO Discord Bot Help",
    description: `
Here are all the commands you can use:

📊 **/summary**  
Get your full AI-powered productivity summary across all connected platforms.

📅 **/todayreport**  
See what you accomplished *today* across GitHub, LeetCode, Spotify, etc.

🔥 **/streak**  
View your active GitHub & LeetCode streaks.

🎯 **/goals**  
Check your current goals & progress.

ℹ️ **/help**  
Show this help menu.

---

## ⚠️ About “The application did not respond”
If you ever see this message:

> *"The application did not respond"*

It means Discord was waiting for the bot for **more than 3 seconds**.

### Why it happens:
- The bot was slow fetching external APIs  
- Your server/API took too long to reply  
- The bot crashed or returned an error  
- No initial reply was sent to Discord  

### How to avoid it:
- Run your commands again  
- Keep your integrations connected  
- Make sure your server is running  
- Ensure the slash command handler sends a **quick response**  
  (even a “Processing your request…” message is enough)

If it continues, use **/help** anytime for assistance.
    `,
    footer: { text: "Eduoo • AICOO Productivity Assistant" },
    timestamp: new Date().toISOString(),
  };

  return { embed };
};
