module.exports = class Common {

    isBust(cs) {
        let r = this.getSum(cs);
        console.log(`${r[0]} ${r[1]}`);
        if (r[0] > 21 && r[1] > 21) {
            return true;
        }
        return false;
    }

    isBlackJack(cs) {
        let r = this.getSum(cs);
        if (r[0] == 21 || r[1] == 21) {
            return true;
        }
        return false;
    }

    getSum(cs) {
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

    getTTRPerMinute(dealerTipTotal, totalGameTime) {
        if (totalGameTime > 0) {
            return Math.max((dealerTipTotal * 0.7) / totalGameTime, 16.6);
        }
        return 16.6; // 최소 지급 기준 적용
    }

}