const { io } = require("socket.io-client");
const socket = io("http://localhost:3001");
socket.on("connect", () => {
    socket.emit(undefined, { test: "UNDEFINED_EVENT" });
    console.log("Emitted undefined");
    setTimeout(() => process.exit(0), 1000);
});
