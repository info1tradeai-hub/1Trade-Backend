import { AiAgentRoi } from "./Aiagent.js";

export const runUserAiAgentRoi = async (user) => {
    try {
        await AiAgentRoi(user);
    } catch (err) {
        console.error(`❌ Failed AiAgent ROI for ${user.email}:`, err.message);
    }
};