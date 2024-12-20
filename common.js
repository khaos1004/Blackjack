module.exports = class Common {
    
    isBust(cs) {
        let r = this.getSum(cs);
        console.log(`${r[0]} ${r[1]}`);
        if(r[0] > 21 && r[1] > 21) {
            return true;
        }
        return false;
    }

    isBlackJack(cs){
        let r = this.getSum(cs);
        if(r[0] == 21 || r[1] == 21) {
            return true;
        }
        return false;
    }

    getSum(cs){
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
}