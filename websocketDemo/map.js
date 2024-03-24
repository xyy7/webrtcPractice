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
    this.conn = conn;//uid对应的websocket连接
    this.roomId = roomId;
    console.log('uid:' + uid + ',conn:' + conn + ',roomId: ' + roomId);
}
    
var roomMap = new ZeroRTCMap();
// Math.random()返回介于 0(包含)~1(不包含) 之间的一个随机数:1
// toString(36)代表36进制，其他一些也可以，比如toString(2)、toString(8)，代表输出为二进制和八进制。
//substr(2) 舍去0/1位置的字符
console.log('\n\n------Math.random()----------');
var randmo = Math.random();
console.log('Math.random()=' + randmo);
console.log('Math.random().tostring(10) =' + randmo.toString(10));
console.log('Math.random().tostring(36) =' + randmo.toString(36));
console.log('Math.random().tostring(36).substr(0) =' + randmo.toString(36).substr(0));
console.log('Math.random().tostring(36).substr(1) =' + randmo.toString(36).substr(1));
console.log('Math.random().tostring(36).substr(2) =' + randmo.toString(36).substr(2));

console.log('\n\n------create client----------');
var roomId = 100;

var uid1 = Math.random().toString(36).substr(2);
var conn1 = 100;
var client1 = new Client(uid1, conn1, roomId);

var uid2 = Math.random().toString(36).substr(2);
var conn2 = 101;
var client2 = new Client(uid2, conn2, roomId);

// 插入put
console.log('\n\n--------------put-----------');
console.log('roomMap put client1');
roomMap.put(uid1, client1);
console.log('roomMap put client2');
roomMap.put(uid2, client2);
console.log('roomMap size:' + roomMap.size());

// 获取get
console.log('\n\n-------------get------------');
var client = null;
var uid = uid1;
Client = roomMap.get(uid);
if (Client != null) {
    console.log('get client->' + 'uid:' + Client.uid + ', conn: ' + Client.conn + ', roomId: ' + Client.roomId);
} else {
    console.log("can't find the client of " + uid);
}

uid = '123345';
Client = roomMap.get(uid);
if (Client != null) {
    console.log('get client->' + 'uid:' + Client.uid + ', conn:' + Client.conn + ', roomId: ' + Client.roomId);
}
else {
    console.log("can't find the client of " + uid);
}

console.log('\n\n--------traverse-----------');
//遍历map
var clients = roomMap.getEntrys();
for (var i in clients) {
    let uid = clients[i].key;
    let client = roomMap.get(uid);
    console.log('get client->' + 'uid:' + client.uid + ', conn:' + client.conn + ', roomId: ' + client.roomId);
}

console.log('\n\n--------remove-----------');
console.log('roomMap remove uid1');
roomMap.remove(uid1);
console.log('roomMap size:' + roomMap.size());

console.log('\n\n------------clear--------');
console.log('roomMap clear all');
roomMap.clear();
console.log('roomMap size:' + roomMap.size());
