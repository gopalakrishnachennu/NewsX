const { initDB } = require("./src/lib/db");

// Run initialization
initDB().then(() => {
    console.log("Database Setup Complete.");
    process.exit(0);
}).catch(err => {
    console.error("Setup Failed:", err);
    process.exit(1);
});
