function init() {
    updateResolution();
    console.log('blackjack game init complete');
}

function updateResolution() {
    var rw = window.innerWidth / 1024;
    var rh = window.innerHeight / 768;
    var r = rw;
    if(rh < rw) {
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
    if(r[0] > 21 && r[1] > 21) {
        return true;
    }
    return false;
}

function isBlackJack(cs) {
    let r = getSum(cs);
    if(r[0] == 21 || r[1] == 21) {
        return true;
    }
    return false;
}

function getSum(cs) {
    let ret=[0, 0];
    for(var i=0;i<cs.length;i++) {
        if(cs[i].number == 1) {
            ret[0] += 1;
            ret[1] += 11;
        } else if(cs[i].number >= 10) {
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
    if(shape == "S") {
        return "♠";
    } else if(shape == "D") {
        return "◆"
    } else if(shape == "H") {
        return "♥"
    } else if(shape == "C") {
        return "♣"
    }
}

function getNumber(num) {
    if(num == 1) {
        return "A";
    } else if(num== "11") {
        return "J";
    } else if(num == "12") {
        return "Q";
    } else if(num == "13") {
        return "K";
    } else {
        return num;
    }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

