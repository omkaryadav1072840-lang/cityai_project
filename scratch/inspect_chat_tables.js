const pool = require('../backend/config/db');

async function inspectChatTables() {
    try {
        const [msgDesc] = await pool.promise().query("DESCRIBE ai_chat_messages");
        console.log("ai_chat_messages:", msgDesc.map(c => ({ Field: c.Field, Type: c.Type })));
        
        const [sessDesc] = await pool.promise().query("DESCRIBE ai_chat_sessions");
        console.log("ai_chat_sessions:", sessDesc.map(c => ({ Field: c.Field, Type: c.Type })));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
inspectChatTables();
