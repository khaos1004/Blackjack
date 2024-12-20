
const Common = require('./common');

module.exports = class Game {
    
    init() {
        this.cards = [];
        this.dcards = [];
        this.userCard = {};
        this.userCard2 = {};
        this.bet = [];
        this.turn = 0;
        
        this.isSplit = false;
        this.isEnd = false;
        this.isSplitEnd = false;
        this.isUserBust = false;
        this.isUserBlackJack = false;
        this.C = new Common();
    }


    start(io, userList, roomId) {
        this.init();
        this.shuffle();
        io.sockets.in(roomId).emit('betting', {});
    }

    
    shuffle() {
        for(var i=1;i<=13;i++) {
            let s = "S"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        for(var i=1;i<=13;i++) {
            let s = "D"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        for(var i=1;i<=13;i++) {
            let s = "H"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        for(var i=1;i<=13;i++) {
            let s = "C"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        this.cards.sort(() => Math.random() - 0.5);
        console.log('suffle is complete');
    }

    betting(io, userList, roomId) {
        this.bet.push(true);
        if(this.bet.length == userList.length) {
            console.log('all user bet done.');
            this.give(io, userList, roomId);
        }
    }

    give(io, userList, roomId) {
        console.log('give!!');

        for(var u of userList) {
            this.userCard[u] = [];
        }

        for(var i=1;i<=2;i++) {
            let card = this.cards.pop();
            this.dcards.push(card);
            
            for(var u of userList) {
                let card2 = this.cards.pop();
                this.userCard[u].push(card2);
            }
        }

        for(var u of userList) {
            io.to(u).emit('give', {
                dc:this.dcards, 
                uc:this.userCard
            });
        }

        this.endturn(io, userList, roomId);
        
    }

    endturn(io, userList, roomId) {
        console.log('endturn, turn = ' + this.turn);
        if(this.turn == userList.length) {
            //dealer play 
            let r = this.C.getSum(this.dcards);
            while(r[1] < 17 || (r[1] > 21 && r[0] < 17)) {
                let card = this.cards.pop();
                this.dcards.push(card);
                if(this.C.isBust(this.dcards) || this.C.isBlackJack(this.dcards)) {
                    break;
                }
                r = this.C.getSum(this.dcards);
            }

            io.sockets.in(roomId).emit('dealerplay', {
                dc : this.dcards
            });

            return;
        }

        io.sockets.in(roomId).emit('turn', {
            userId : userList[this.turn]
        });
        this.turn+=1;

    }

    hit(io, id, isEnd, roomId) {
        let card = this.cards.pop();

        io.sockets.in(roomId).emit('hit', {
            id : id,
            card : card,
            isEnd : isEnd
        });

    }

    doubleDown(io, id, isEnd, roomId) {
        let card = this.cards.pop();

        io.sockets.in(roomId).emit('doubledown', {
            id : id,
            card : card,
            isEnd : isEnd
        });
    }


}