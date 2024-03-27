var ws = require("nodejs-websocket");
var port = 8010;
var user = 0;


// join 主动加入房间
// leave 主动离开房间
// new-peer 有人加入房间，通知已经在房间的人
// peer-leave 有人离开房间，通知已经在房间的人
// offer 发送offer给对端peer
// answer发送offer给对端peer
// candidate 发送candidate给对端peer
const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join";//告知加入者对方是谁
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";


var ZeroRTCMap = function () {
    this._entrys = new Array();// 插入
    this.put = function (key, value) {
        if (key == null || key == undefined) {
            return;
        }
        var index = this._getIndex(key);
        if (index == -1) {
            var entry = new Object();
            entry.key = key;
            entry.value = value;
            this._entrys[this._entrys.length] = entry;
        } else {
            this._entrys[index].value = value;
        };
    };

    // 根据key获取value
    this.get = function (key) {
        var index = this._getIndex(key);
        return (index != -1) ? this._entrys[index].value : null;
    };
    
    //移除key-value
    this.remove = function (key) {
        var index = this._getIndex(key);
        if (index != -1) {
            this._entrys.splice(index, 1);
        }
    };
    
    //清空array
    this.clear = function () {
        this._entrys.length = 0;
    };
    
    // 判断是否包含key
    this.contains = function (key) {
        var index = this._getIndex(key);
        return (index != -1) ? true : false;
    };
    
    // map内key-value的数量
    this.size = function () {
        return this._entrys.length;
    };
    
    //获取所有的key
    this.getEntrys = function () {
        return this._entrys;
    };
    
    //内部函数
    this._getIndex = function (key) {
        if (key == null || key == undefined) {
            return -1;
        }
        var _length = this._entrys.length;
        for (var i = 0; i < _length; i++) {
            var entry = this._entrys[i];
            if (entry == null || entry == undefined) {
                continue;
            }
            if (entry.key === key) {// equal
                return i;
            }
        }
        return -1;
    };
}

function Client(uid, conn, roomId) {
    // 用户所属的id
    this.uid = uid;
    this.conn = conn; //uid对应的websocket连接
    this.roomId = roomId;
    console.log('create uid:' + uid + ',conn:' + conn + ' ,roomId: ' + roomId);
}

function broadcast(str) {
    server.connections.forEach(function (connection) {
        connection.sendText(str);
    });
}




function handleJoin(message, conn) {
    var roomId = message.roomId;
    var uid = message.uid;
    console.info("uid:" + uid + " try to join room " + roomId);

    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        roomMap = new ZeroRTCMap();
        roomTableMap.put(roomId, roomMap);
    }
    if (roomMap.size() >= 2) {
        console.error("roomId:" + roomId + " 已经有两人存在，请使用其他房间");
        //加信令通知客户端，房间已满
        return;
    }

    var client = new Client(uid, conn, roomId);
    roomMap.put(uid, client);

    if (roomMap.size() > 1) {
        // 房问里面已经有人了，加上新进来的人，那就是>=2了，所以要通知对方
        var clients = roomMap.getEntrys();
        for (var i in clients) {
            var remoteUid = clients[i].key;
            if (remoteUid != uid) {
                var jsonMsg = {
                    'cmd': SIGNAL_TYPE_NEW_PEER, 
                    'remoteUid': uid
                };
                var msg = JSON.stringify(jsonMsg);
                var remoteClient = roomMap.get(remoteUid);
                console.info("new-peer:" + msg);
                remoteClient.conn.sendText(msg);

                jsonMsg = {
                    "cmd": SIGNAL_TYPE_RESP_JOIN,
                    "remoteUid": remoteUid,
                };
                msg = JSON.stringify(jsonMsg);
                console.info("resp-join:" + msg);  //进行p2p打洞
                conn.sendText(msg);
            }

        }
    }
    return client
}

function handleLeave(message) {
    var roomId = message.roomId;
    var uid = message.uid;
    console.info("uid:" + uid + " leave room " + roomId);
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        console.error("handleLeave can't find then roomId " + roomId);
        return;
    }
    roomMap.remove(uid);
    if (roomMap.size() >= 1) {
        // 删除发送者
        var clients = roomMap.getEntrys();
        for (var i in clients) {
            var jsonMsg = {
                'cmd': SIGNAL_TYPE_PEER_LEAVE,
                'remoteUid': uid, // 谁离开就填写谁
            };
            var msg = JSON.stringify(jsonMsg);
            var remoteUid = clients[i].key;
            var remoteclient = roomMap.get(remoteUid);
            if (remoteclient) {
                console.info("notify peer:" + remoteclient.uid + ",uid:" + uid + " leave");
                remoteclient.conn.sendText(msg);
            }
        }
    }
}

function handleForceLeave(client) {
    var roomId = client.roomId;
    var uid = client.uid;
    console.info("uid:" + uid + " force leave room " + roomId);
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        console.warn("handleForceLeave can't find then roomId " + roomId);
        return;
    }
    if (!roomMap.contains(uid)) {
        console.info("uid " + uid + " have leave room.");
        return;
    }

    roomMap.remove(uid);
    if (roomMap.size() >= 1) {
        // 删除发送者
        var clients = roomMap.getEntrys();
        for (var i in clients) {
            var jsonMsg = {
                'cmd': SIGNAL_TYPE_PEER_LEAVE,
                'remoteUid': uid, // 谁离开就填写谁
            };
            var msg = JSON.stringify(jsonMsg);
            var remoteUid = clients[i].key;
            var remoteclient = roomMap.get(remoteUid);
            if (remoteclient) {
                console.info("notify peer:" + remoteclient.uid + ",uid:" + uid + " leave");
                remoteclient.conn.sendText(msg);
            }
        }
    }
}



function handleOffer(message) {
    var roomId = message.roomId;
    var uid = message.uid;
    var remoteUid = message.remoteUid;
    console.info("handleOffer uid: " + uid + " transfer offer to remoteUid " + remoteUid);
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        console.error("handleOffer can't find then roomId " + roomId);
        return;
    }
    if (roomMap.get(uid) == null) {
        console.error("can't find then uid " + uid);
        return;
    }
    var remoteclient = roomMap.get(remoteUid);
    if (remoteclient) { 
        var msg = JSON.stringify(message);
        remoteclient.conn.sendText(msg);
    } else {
        console.error("can't find remoteUid:" + remoteUid);
    }
}

function handleAnswer(message) {
    var roomId = message.roomId;
    var uid = message.uid;
    var remoteUid = message.remoteUid;
    console.info("handleAnswer uid: " + uid + " transfer offer to remoteUid " + remoteUid);
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        console.error("handleAnswer can't find then roomId " + roomId);
        return;
    }
    if (roomMap.get(uid) == null) {
        console.error("can't find then uid " + uid);
        return;
    }
    var remoteclient = roomMap.get(remoteUid);
    if (remoteclient) {
        var msg = JSON.stringify(message);
        remoteclient.conn.sendText(msg);
    } else {
        console.error("can't find remoteUid:" + remoteUid);
    }
}

function handleCandidate(message) {
    var roomId = message.roomId;
    var uid = message.uid;
    var remoteUid = message.remoteUid;
    console.info("handle candidate uid: " + uid + " transfer offer to remoteUid " + remoteUid);
    var roomMap = roomTableMap.get(roomId);
    if (roomMap == null) {
        console.error("handleCandidate can't find then roomId " + roomId);
        return;
    }
    if (roomMap.get(uid) == null) {
        console.error("can't find then uid " + uid);
        return;
    }
    var remoteclient = roomMap.get(remoteUid);
    if (remoteclient) {
        var msg = JSON.stringify(message);
        remoteclient.conn.sendText(msg);
    } else {
        console.error("can't find remoteUid:" + remoteUid);
    }
}


var roomTableMap = new ZeroRTCMap();
//创建一个连接
var server = ws.createServer(function (conn) {
    console.log("创建一个新的连接--------");
    // console.log("我收到你的连接了---------");
    //向客户端推送消息
    conn.client = null
    conn.on("text", function (str) {
        // console.log("recv msg" + str);

        var jsonMsg = JSON.parse(str);
        console.log("recv msg cmd " +jsonMsg.cmd); 
        switch (jsonMsg.cmd) {
            case SIGNAL_TYPE_JOIN:
                conn.client = handleJoin(jsonMsg, conn);
                break;
            case SIGNAL_TYPE_LEAVE:
                handleLeave(jsonMsg, conn);
                break;
            case SIGNAL_TYPE_ANSWER:
                handleAnswer(jsonMsg, conn);
                break;
            case SIGNAL_TYPE_OFFER:
                handleOffer(jsonMsg, conn);
                break;
            case SIGNAL_TYPE_CANDIDATE:
                handleCandidate(jsonMsg, conn);
                break;
        }

    });
    //监听关闭连接操作
    conn.on("close", function (code, reason) {
        console.log("关闭连接");
        if (conn.client != null) {
            handleForceLeave(conn.client);
        }
    })
    //错误处理
    conn.on("error", function (err) {
        console.log("监听到错误");
        console.log(err);
    });
}).listen(port);

// server.listen(port, () => {
//     console.log('监听8010');
// });

