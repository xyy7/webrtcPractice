'use strict'


const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join";//告知加入者对方是谁
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var localStream = null;
var remoteStream = null;
var roomId;

var localUserId = Math.random().toString(36).substr(2);// 本地uid
var remoteUserId = -1; //对端
var pc = null; // peer connection


var ZeroRTCEngine = function (wsUrl) {
    this.init(wsUrl);
    zeroRTCEngine = this;
    return this;
}

ZeroRTCEngine.prototype.init = function (wsUrl) {
    //设置websocket url
    this.wsUrl = wsUrl;
    /** websocket对象 */
    this.signaling = null;
}

ZeroRTCEngine.prototype.createWebsocket = function () {
    zeroRTCEngine = this;
    zeroRTCEngine.signaling = new WebSocket(this.wsUrl);
    zeroRTCEngine.signaling.onopen = function () { zeroRTCEngine.onOpen(); }
    zeroRTCEngine.signaling.onmessage = function (ev) { zeroRTCEngine.onMessage(ev); }
    zeroRTCEngine.signaling.onerror = function (ev) { zeroRTCEngine.onError(ev); }
    zeroRTCEngine.signaling.onclose = function (ev){  zeroRTCEngine.onClose(ev); }
}


ZeroRTCEngine.prototype.onOpen = function () {
    console.log("websocket open");
}
ZeroRTCEngine.prototype.onMessage = function (event) {
    // console.log("onMessage: " + event.data);
    console.log("onMessage");

    var jsonMsg;
    try {
        jsonMsg = JSON.parse(event.data);
    }
    catch (e) {
        console.warn("onMessage parse Json failed:" + e);
        return;
    }
    console.log("recv cmd: "+ jsonMsg.cmd);
    switch (jsonMsg.cmd) {
        case SIGNAL_TYPE_NEW_PEER:
            handleRemoteNewPeer(jsonMsg);
            break;
        case SIGNAL_TYPE_RESP_JOIN:
            handleResponseJoin(jsonMsg);
            break;
        case SIGNAL_TYPE_PEER_LEAVE:
            handleRemotePeerLeave(jsonMsg);
            break;
        case SIGNAL_TYPE_OFFER:
            handleRemoteOffer(jsonMsg);
            break;
        case SIGNAL_TYPE_ANSWER:
            handleRemoteAnswer(jsonMsg);
            break;
        case SIGNAL_TYPE_CANDIDATE:
            handleRemoteCandidate(jsonMsg);
            break;
    }
}

ZeroRTCEngine.prototype.onError = function (event) {
    console.log("onError: " + event.data);
}

ZeroRTCEngine.prototype.onClose = function (event) {
    console.log("onClose: " + event.data);
}

ZeroRTCEngine.prototype.sendMessage = function (msg) {
    this.signaling.send(msg);
}

// 1. join 和resp-join
function doJoin(roomId) {
    var jsonMsg = { 
        'cmd': 'join',
        'roomId': roomId,
        'uid': localUserId,
    };
    var message = JSON.stringify(jsonMsg);
    zeroRTCEngine.sendMessage(message);
    // console.info("doJoin message:" + message);
    console.info("doJoin message");
}

//只有第二个人进入的时候，才会调用responseJoin
function handleResponseJoin(message) {
    console.info("handleResponseJoin, remoteUid: " + message.remoteUid);
    remoteUserId = message.remoteUid;
    // doOffer(); //只有一方能够创建offer
}

//相对于第一个人来说，同伙来咯，开始doOffer
function handleRemoteNewPeer(message) {
    console.info("handleRemoteNewPeer, remoteUid: " + message.remoteUid); remoteUserId = message.remoteUid;
    doOffer();  //只有一方能够创建offer，不能双方同时创建
}


function openLocalStream(stream) {
    console.log('0pen local stream');
    doJoin(roomId);
    localVideo.srcObject = stream;
    localStream = stream;
}
 
function initLocalStream() {
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    })
    .then(openLocalStream)
    .catch(function (e) {
        alert("getUserMedia() error:" + e.name);
    });
}

// 2. leave 
function doLeave() {
    var jsonMsg = {
        'cmd': 'leave',
        'roomId': roomId,
        'uid': localUserId,
    };
    var message = JSON.stringify(jsonMsg);
    zeroRTCEngine.sendMessage(message);
    // console.info("doLeave message: " + message);
    console.info("doLeave message");
}

function handleRemotePeerLeave(message) {
    console.info("handleRemotePeerLeave,remoteUid:" + message.remoteUid);
    remoteVideo.srcobject =null;
}


// 3. offer, answer
function handleIceCandidate(event) {
    console.info("handleIceCandidate");
    if (event.candidate) {
        var jsonMsg = {
            'cmd': 'candidate',
            'roomId': roomId,
            'uid': localUserId,
            'remoteUid': remoteUserId,
            'msg': JSON.stringify(event.candidate)
        };
        var message = JSON.stringify(jsonMsg);
        zeroRTCEngine.sendMessage(message);
        // console.info("handleIceCandidate message:" + message);
    } else {
        console.warn("End of candidates");
    }
}

function handleRemoteStreamAdd(event) {
    console.info("handleRemotestreamAdd");
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

function createPeerConnection() {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleRemoteStreamAdd;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
}

function createAnswerAndSendMessage(localDescription) {
    console.log("set local sdp");
    pc.setLocalDescription(localDescription)
        .then(function () {
            var jsonMsg = {
                'cmd': 'answer',
                'roomId': roomId,
                'uid': localUserId,
                'remoteUid': remoteUserId,
                'msg': JSON.stringify(localDescription)
            };
            var message = JSON.stringify(jsonMsg);
            zeroRTCEngine.sendMessage(message);
            console.info("send answer message");
            // console.info("send answer message:" + message);
        })
        .catch(function (error) {
            console.error("answer setLocalDiscription failed:" + error);
        });
}

function handleCreateOfferError(error) {
    console.error("handleCreateOfferError:" + error);
}

function handleCreateAnswerError(error) {
    console.error("handleCreateAnswerError:" + error);
}

function createOfferAndSendMessage(session) {
    console.log("set local sdp");
    pc.setLocalDescription(session)
        .then(function () {
            var jsonMsg = {
                'cmd': 'offer',
                'roomId': roomId,
                'uid': localUserId,
                'remoteUid': remoteUserId,
                'msg': JSON.stringify(session)
            };
            var message = JSON.stringify(jsonMsg);
            zeroRTCEngine.sendMessage(message);
            // console.info("send offer message:" + message);
            console.info("send offer message");
        })
        .catch(function (error) {
            console.error("offer setLocalDiscription failed:" + error);
        });
}

function handleRemoteOffer(message) {
    console.info("handleRemoteOffer");
    if (pc == null) {
        createPeerConnection();
    }
    var desc = JSON.parse(message.msg);
    console.log("set remote sdp");
    pc.setRemoteDescription(desc);
    console.log("set remote sdp success");
    doAnswer();
}

function handleRemoteAnswer(message) { 
    console.info("handleRemoteAnswer");
    var desc = JSON.parse(message.msg);
    console.log("set remote sdp");
    pc.setRemoteDescription(desc);
    console.log("set remote sdp success");

}

function handleRemoteCandidate(message) { 
    console.info("handleRemoteCandidate");
    var candidate = JSON.parse(message.msg);
    console.log("set candidate: " + candidate);
    pc.addIceCandidate(candidate)
        .catch(e => {
            console.error("addIceCandidate failed:" + e.name)
        });
}

function doOffer() {
    //创建RTCPeerconnection
    if (pc == null) {
        createPeerConnection();
    }
    pc.createOffer().then(createOfferAndSendMessage).catch(handleCreateOfferError);
}

function doAnswer() {
    pc.createAnswer().then(createAnswerAndSendMessage).catch(handleCreateAnswerError);

}



        
document.getElementById('joinBtn').onclick = function () {
    roomId = document.getElementById('zero-RoomId').value;
    if (roomId == "" || roomId == "请输入房间ID") {
        alert("请输入房间ID");
        return;
    }
    console.log("加入按钮被点击, roomId: "+roomId);
    // 初始化本地码流
    initLocalStream();
}

var zeroRTCEngine = new ZeroRTCEngine("ws://172.31.224.90:8010");
zeroRTCEngine.createWebsocket();

document.getElementById('leaveBtn').onclick = function () {
    console.log("离开按钮被点击, roomId: "+roomId);
    // 初始化本地码流
    doLeave();
}