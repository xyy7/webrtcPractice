var ws = require("nodejs-websocket")
//scream server example:"hi"->"HI!!!"
var server = ws.createserver(function (conn) {
    console.log("New connection");
    conn.on("text", function (str) { // 收到数据的响应
        console.log("Received" + str);
        conn.sendText(str.toUpperCase() + "!!!");
    });
    conn.on("close", function (code, reason) {
        console.log("connection closed");
    });
    conn.on("error", function (err) {
        console.log("error:" + err);
    });
}).listen(8001)