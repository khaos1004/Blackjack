let dealerTipTotal = 0;

function updateDealerTip(amount) {
    dealerTipTotal += amount;
    console.log(`💰 딜러팁 업데이트됨: 현재 총 딜러팁 ${dealerTipTotal}`);
}

module.exports = {
    dealerTipTotal,
    updateDealerTip
};
