export const buildHelpMessage = () => {
  const embed = {
    color: 0x5865f2,
    title: "🧭 AICOO Discord Bot Help",
    description: `
📊 **/summary** — View full AI-powered daily productivity report  
📅 **/todayreport** — View today's focused activity  
🔥 **/streak** — Track streaks across LeetCode, GitHub & Duolingo  
🎯 **/goals** — Check your active/completed goals  
ℹ️ **/help** — List all available commands  
    `,
    footer: { text: "Eduoo • AICOO Productivity Assistant" },
    timestamp: new Date().toISOString(),
  };

  return { embed };
};
