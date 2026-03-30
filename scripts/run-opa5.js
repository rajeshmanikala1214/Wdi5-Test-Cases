const { spawn } = require("child_process");

const karma = spawn(
    "npx",
    ["karma", "start", "karma.conf.js"],
    {
        stdio: "inherit",
        shell: true
    }
);

karma.on("close", (code) => {
    process.exit(code);
});