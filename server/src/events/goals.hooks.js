// src/events/goals.hooks.js
import Goal from "../models/Goal.js";

/**
 * Attach this file once at server startup (e.g. in app.js/index.js)
 * require('./events/goals.hooks.js') or import it from your bootstrap code.
 */

// Use post('save') to mark a goal changed and needing sync
Goal.schema.post("save", async function (doc) {
  try {
    // Only mark needsSync when relevant fields change — keep it simple: always mark
    if (!doc.needsSync) {
      doc.needsSync = true;
      await doc.constructor.findByIdAndUpdate(doc._id, { needsSync: true });
    }
  } catch (err) {
    console.error("❌ Goal hook error:", err.message);
  }
});
