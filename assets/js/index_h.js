function init() {
    updateResolution();
    console.log('blackjack game init complete');
}

function updateResolution() {
    var rw = window.innerWidth / 1024;
    var rh = window.innerHeight / 768;
    var r = rw;
    if (rh < rw) {
        r = rh;
    }
    console.log(rw + ", " + rh);
    var gw = (window.innerWidth - (1024 * r)) / 2;
    var gh = (window.innerHeight - (768 * r)) / 2;
    $('body').css('margin-left', gw);
    $('body').css('margin-top', gh);
    $('#content').css('transform', `scale(${r.toFixed(4)},${r.toFixed(4)})`);
    console.log('updateResolution');
}

window.onresize = () => init();


function isBust(cs) {
    let r = getSum(cs);
    console.log(`${r[0]} ${r[1]}`);
    if (r[0] > 21 && r[1] > 21) {
        return true;
    }
    return false;
}

function isBlackJack(cs) {
    let r = getSum(cs);
    if (r[0] == 21 || r[1] == 21) {
        return true;
    }
    return false;
}

function getSum(cs) {
    let ret = [0, 0];
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].number == 1) {
            ret[0] += 1;
            ret[1] += 11;
        } else if (cs[i].number >= 10) {
            ret[0] += 10;
            ret[1] += 10;
        } else {
            ret[0] += cs[i].number;
            ret[1] += cs[i].number;
        }
    }
    return ret;
}

function getShape(shape) {
    if (shape == "S") {
        return "♠";
    } else if (shape == "D") {
        return "◆"
    } else if (shape == "H") {
        return "♥"
    } else if (shape == "C") {
        return "♣"
    }
}

function getNumber(num) {
    if (num == 1) {
        return "A";
    } else if (num == "11") {
        return "J";
    } else if (num == "12") {
        return "Q";
    } else if (num == "13") {
        return "K";
    } else {
        return num;
    }
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

let idleTime = 0;
const idleLimit = 180000; // 3분 (밀리초)

// 사용자의 활동 감지 후 타이머 초기화
function resetIdleTimer() {
    idleTime = 0; // 타이머 리셋
    socket.emit("resume_rewards"); // ⏳ 유저가 다시 활동하면 리워드 재개 요청
}

document.addEventListener("mousemove", resetIdleTimer);
document.addEventListener("keydown", resetIdleTimer);
document.addEventListener("click", resetIdleTimer);

// 🎯 게임 진행 버튼 클릭 감지 (btn-group 내부 버튼 클릭 시 타이머 초기화)
document.getElementById("btn-group")?.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
        resetIdleTimer();
    }
});

// ⏳ 1초마다 idleTime 증가 → 3분 이상이면 서버에 알림 보내기
setInterval(() => {
    idleTime += 1000;
    if (idleTime >= idleLimit) {
        console.log("🚨 [클라이언트] 3분 동안 비활성 상태 감지! stop_rewards 전송");
        socket.emit("stop_rewards");  // 서버에 리워드 중지 요청
    }
}, 1000);