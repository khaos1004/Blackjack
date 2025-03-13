
const Common = require('./common');
const { updateDealerTip } = require('./gameState');





module.exports = class Game {

    init() {

        // const PURCHASE_LIMIT = 700_000_000_000; // 700억냥
        // const ENTRY_AMOUNT = 1000000000; // 10억냥
        // const MAX_BET_LIMIT = PURCHASE_LIMIT / 200; // 3억 5000만냥
        // const MAX_WIN_LIMIT = PURCHASE_LIMIT / 10; // 70억냥
        // const MIN_BET_AMOUNT = 100000; // 10만냥
        // const MAX_BET_AMOUNT = 1000000; // 100만냥


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
        for (var i = 1; i <= 13; i++) {
            let s = "S"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        for (var i = 1; i <= 13; i++) {
            let s = "D"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        for (var i = 1; i <= 13; i++) {
            let s = "H"
            let c = {};
            c.shape = s;
            c.number = i;
            this.cards.push(c);
        }
        for (var i = 1; i <= 13; i++) {
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
        if (this.bet.length == userList.length) {
            console.log('all user bet done.');
            this.give(io, userList, roomId);
        }
    }

    give(io, userList, roomId) {
        console.log('give!!');

        for (var u of userList) {
            this.userCard[u] = [];
        }

        for (var i = 1; i <= 2; i++) {
            let card = this.cards.pop();
            this.dcards.push(card);

            for (var u of userList) {
                let card2 = this.cards.pop();
                this.userCard[u].push(card2);
            }
        }

        for (var u of userList) {
            io.to(u).emit('give', {
                dc: this.dcards,
                uc: this.userCard
            });
        }

        this.endturn(io, userList, roomId);

    }

    endturn(io, userList, roomId) {
        console.log('🔄 턴 종료, 현재 턴: ' + this.turn);

        if (this.turn === userList.length) {
            // 딜러 플레이 시작
            let dealerSum = this.C.getSum(this.dcards);

            while (dealerSum[1] < 17 || (dealerSum[1] > 21 && dealerSum[0] < 17)) {
                let card = this.cards.pop();
                this.dcards.push(card);

                if (this.C.isBust(this.dcards) || this.C.isBlackJack(this.dcards)) {
                    break;
                }

                dealerSum = this.C.getSum(this.dcards);
            }

            io.sockets.in(roomId).emit('dealerplay', { dc: this.dcards });

            // 💰 딜러 플레이 후 보상 정산 실행
            this.calculateRewards(io, userList, roomId);
            return;
        }

        io.sockets.in(roomId).emit('turn', { userId: userList[this.turn] });
        this.turn += 1;
    }


    calculateRewards(io, userList, roomId) {
        console.log("🎲 게임 종료: 보상 정산 시작");

        let totalDealerTip = 0;  // 🔹 이 값을 `blackjack.js`로 넘길 예정

        for (let user of userList) {
            let playerCards = this.userCard[user];
            let dealerCards = this.dcards;

            let playerSum = this.C.getSum(playerCards);
            let dealerSum = this.C.getSum(dealerCards);

            let isPlayerBust = this.C.isBust(playerCards);
            let isDealerBust = this.C.isBust(dealerCards);
            let isPlayerBlackjack = this.C.isBlackJack(playerCards);
            let isDealerBlackjack = this.C.isBlackJack(dealerCards);

            let betAmount = this.bet[user] || 0;
            let reward = 0;

            if (!isPlayerBust && (isDealerBust || playerSum[1] > dealerSum[1])) {
                reward = betAmount * 2;
            } else if (isPlayerBlackjack && !isDealerBlackjack) {
                reward = betAmount * 2.5;
            } else if (isPlayerBlackjack && isDealerBlackjack) {
                reward = betAmount;
            } else {
                reward = betAmount;
            }

            if (reward > 0) {
                let dealerTip = reward * 0.05;
                totalDealerTip += dealerTip;
                reward -= dealerTip;
                io.to(user).emit('reward', { amount: reward });
            }
        }

        // 💰 `blackjack.js`의 `dealerTipTotal`을 업데이트
        updateDealerTip(totalDealerTip);
    }

    hit(io, id, isEnd, roomId) {
        let card = this.cards.pop();

        io.sockets.in(roomId).emit('hit', {
            id: id,
            card: card,
            isEnd: isEnd
        });

    }

    doubleDown(io, id, isEnd, roomId) {
        let card = this.cards.pop();

        io.sockets.in(roomId).emit('doubledown', {
            id: id,
            card: card,
            isEnd: isEnd
        });
    }


}
