// 遊戲狀態
const gameState = {
    playerHealth: 30,
    opponentHealth: 30,
    playerHand: [],
    playerField: [],
    opponentHand: [],
    opponentField: [],
    isPlayerTurn: true,
    maxMana: 1,
    currentMana: 1,
    drawCountThisTurn: 0,
    maxDrawPerTurn: 2,
    selectedCard: null,  // 新增：追蹤選中的卡牌
    isInitialDraw: true // 新增：標記是否為初始抽牌
};

// 卡牌資料庫
const cardDatabase = [
    { id: 1, name: '勇士', attack: 2, defense: 2, cost: 1 },
    { id: 2, name: '弓箭手', attack: 1, defense: 1, cost: 1 },
    { id: 3, name: '騎士', attack: 3, defense: 3, cost: 2 },
    { id: 4, name: '法師', attack: 1, defense: 3, cost: 2 },
    { id: 5, name: '龍', attack: 5, defense: 4, cost: 3 }
];

// 更新遊戲狀態顯示
function updateGameUI() {
    document.getElementById('player-health').textContent = gameState.playerHealth;
    document.getElementById('opponent-health').textContent = gameState.opponentHealth;
    document.getElementById('current-mana').textContent = gameState.currentMana;
    document.getElementById('max-mana').textContent = gameState.maxMana;
}

// 添加戰鬥紀錄
function addBattleLog(message) {
    const logContent = document.getElementById('battle-log-content');
    if (!logContent) return;
    
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    logContent.insertBefore(logEntry, logContent.firstChild);

    // 保持最多顯示10條記錄
    while (logContent.children.length > 10) {
        logContent.removeChild(logContent.lastChild);
    }
}

// 建立卡牌元素
function createCardElement(card, isOpponent = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${isOpponent ? 'opponent-card' : ''} animate__animated animate__fadeIn`;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.location = isOpponent ? (card.isInHand ? 'opponent-hand' : 'opponent-field') : (card.isInHand ? 'player-hand' : 'player-field');
    
    if (isOpponent && card.isInHand) {
        cardElement.innerHTML = `<div class="card-back">?</div>`;
    } else {
        cardElement.innerHTML = `
            <div class="cost">${card.cost}</div>
            <div class="name">${card.name}</div>
            <div class="attack">${card.attack}</div>
            <div class="defense">${card.defense}</div>
        `;
    }

    // 為玩家手牌添加點擊事件
    if (!isOpponent && card.isInHand) {
        cardElement.onclick = (e) => {
            e.stopPropagation();
            if (gameState.isPlayerTurn) {
                playCard(card, cardElement);
            }
        };
    }

    // 為玩家場上的卡牌添加點擊事件
    if (!isOpponent && !card.isInHand) {
        cardElement.onclick = (e) => {
            e.stopPropagation();
            if (gameState.isPlayerTurn) {
                selectAttackingCard(card, cardElement);
            }
        };
    }

    // 為對手場上的卡牌添加目標事件
    if (isOpponent && !card.isInHand) {
        cardElement.onclick = (e) => {
            e.stopPropagation();
            if (gameState.selectedCard && cardElement.classList.contains('valid-target')) {
                handleAttack(e, card, cardElement);
            }
        };
    }

    return cardElement;
}

// 打出卡牌
function playCard(card, cardElement) {
    if (!gameState.isPlayerTurn) {
        Swal.fire('請等待對手回合結束');
        return;
    }

    if (!gameState.playerHand.includes(card)) {
        return;
    }

    if (gameState.currentMana < card.cost) {
        Swal.fire('魔力不足！');
        return;
    }

    if (gameState.playerField.length >= 5) {
        Swal.fire('場上卡牌已滿！');
        return;
    }

    gameState.currentMana -= card.cost;
    updateGameUI();
    
    gameState.playerHand = gameState.playerHand.filter(c => c.id !== card.id);
    card.isInHand = false;
    card.canAttack = false;
    gameState.playerField.push(card);
    
    cardElement.remove();
    const fieldCard = createCardElement(card, false);
    document.querySelector('.player-field').appendChild(fieldCard);
    
    addBattleLog(`你使用了 ${card.name}（${card.attack}/${card.defense}）`);
}

// 選擇攻擊的卡牌
function selectAttackingCard(card, cardElement) {
    if (!gameState.isPlayerTurn) return;
    
    // 檢查卡牌是否在場上
    if (!gameState.playerField.includes(card)) return;
    
    // 取消之前的選擇
    cleanupAttackState();
    
    if (card.canAttack) {
        gameState.selectedCard = card;
        cardElement.classList.add('selected');
        setupAttackTargets();
    } else {
        gameState.selectedCard = null;
        addBattleLog("這張卡牌本回合已經攻擊過了");
    }
}

// 處理卡牌攻擊
function handleAttack(event, defendingCard, defendingElement) {
    event.stopPropagation();
    
    if (!gameState.selectedCard) return;

    const attackingCard = gameState.selectedCard;
    
    // 執行攻擊
    defendingCard.defense -= attackingCard.attack;
    attackingCard.defense -= defendingCard.attack;
    attackingCard.canAttack = false;

    addBattleLog(`${attackingCard.name}（${attackingCard.attack}/${attackingCard.defense}）攻擊了 ${defendingCard.name}（${defendingCard.attack}/${defendingCard.defense}）`);

    // 更新卡牌顯示
    const attackingElement = document.querySelector(`.card[data-card-id="${attackingCard.id}"]`);
    if (attackingElement) {
        attackingElement.querySelector('.defense').textContent = attackingCard.defense;
    }
    defendingElement.querySelector('.defense').textContent = defendingCard.defense;

    // 處理卡牌死亡
    if (defendingCard.defense <= 0) {
        gameState.opponentField = gameState.opponentField.filter(c => c.id !== defendingCard.id);
        defendingElement.remove();
        addBattleLog(`${defendingCard.name} 被摧毀了`);
    }
    if (attackingCard.defense <= 0) {
        gameState.playerField = gameState.playerField.filter(c => c.id !== attackingCard.id);
        attackingElement?.remove();
        addBattleLog(`${attackingCard.name} 被摧毀了`);
    }

    cleanupAttackState();
}

// 處理直接攻擊
function handleDirectAttack(event) {
    event.stopPropagation();
    
    if (!gameState.selectedCard) return;

    const attackingCard = gameState.selectedCard;
    gameState.opponentHealth -= attackingCard.attack;
    attackingCard.canAttack = false;
    
    addBattleLog(`${attackingCard.name} 直接攻擊了對手，造成 ${attackingCard.attack} 點傷害`);
    
    updateGameUI();

    // 檢查遊戲結束
    if (gameState.opponentHealth <= 0) {
        Swal.fire('遊戲結束', '你贏了！', 'success').then(() => {
            location.reload();
        });
        return;
    }

    cleanupAttackState();
}

// 設置可攻擊目標
function setupAttackTargets() {
    if (!gameState.selectedCard) return;

    // 為對手場上的每張卡牌添加可攻擊標記
    const opponentCards = document.querySelectorAll('.opponent-field .card');
    opponentCards.forEach(card => {
        card.classList.add('valid-target');
    });
    
    // 只有在對手場上沒有卡牌時才能直接攻擊對手
    if (opponentCards.length === 0) {
        const opponentStats = document.querySelector('.opponent-stats');
        if (opponentStats) {
            opponentStats.classList.add('valid-target');
            opponentStats.onclick = handleDirectAttack;
        }
    }
}

// 清理戰鬥狀態
function cleanupAttackState() {
    // 移除所有已選中和可攻擊標記
    document.querySelectorAll('.card.selected, .valid-target').forEach(element => {
        element.classList.remove('selected', 'valid-target');
    });

    // 移除對手狀態區域的攻擊標記和事件
    const opponentStats = document.querySelector('.opponent-stats');
    if (opponentStats) {
        opponentStats.classList.remove('valid-target');
        opponentStats.onclick = null;
    }

    gameState.selectedCard = null;
}

// 抽牌功能
function drawCard(isOpponent = false) {
    console.log(`Drawing card for ${isOpponent ? 'opponent' : 'player'}`);
    
    // 檢查是否達到抽牌上限（初始抽牌不受限制）
    if (!isOpponent && !gameState.isInitialDraw && gameState.drawCountThisTurn >= gameState.maxDrawPerTurn) {
        Swal.fire('本回合已無法抽更多牌');
        return;
    }

    if ((isOpponent && gameState.opponentHand.length >= 7) || 
        (!isOpponent && gameState.playerHand.length >= 7)) {
        return;
    }

    const randomCard = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    const card = { 
        ...randomCard,
        id: Math.random().toString(36).substr(2, 9),
        isInHand: true,
        canAttack: false
    };
    
    if (isOpponent) {
        gameState.opponentHand.push(card);
        const cardElement = createCardElement(card, true);
        document.querySelector('.opponent-hand').appendChild(cardElement);
        addBattleLog("對手抽了一張牌");
    } else {
        gameState.playerHand.push(card);
        const cardElement = createCardElement(card);
        document.querySelector('.player-hand').appendChild(cardElement);
        if (!gameState.isInitialDraw) {
            gameState.drawCountThisTurn++;
        }
        addBattleLog("你抽了一張牌");
    }
    
    console.log(`Card drawn successfully. Hand size: ${isOpponent ? gameState.opponentHand.length : gameState.playerHand.length}`);
}

// AI對手的回合
function opponentTurn() {
    gameState.isPlayerTurn = false;
    addBattleLog("對手的回合開始了");
    
    setTimeout(() => {
        // 嘗試打出手牌
        if (gameState.opponentHand.length > 0 && gameState.opponentField.length < 5) {
            const card = gameState.opponentHand[0];
            card.isInHand = false;
            gameState.opponentHand.shift();
            gameState.opponentField.push(card);
            
            document.querySelector('.opponent-hand').firstChild?.remove();
            const fieldCard = createCardElement(card, true);
            document.querySelector('.opponent-field').appendChild(fieldCard);
            
            addBattleLog(`對手使用了 ${card.name}（${card.attack}/${card.defense}）`);
        }

        // AI攻擊邏輯
        gameState.opponentField.forEach(card => {
            if (gameState.playerField.length > 0) {
                // 攻擊玩家的隨機卡牌
                const targetIndex = Math.floor(Math.random() * gameState.playerField.length);
                const targetCard = gameState.playerField[targetIndex];
                
                addBattleLog(`對手的 ${card.name} 攻擊了 ${targetCard.name}`);
                
                targetCard.defense -= card.attack;
                card.defense -= targetCard.attack;

                // 更新或移除受損卡牌
                const targetElement = document.querySelector(`.player-field .card[data-card-id="${targetCard.id}"]`);
                if (targetCard.defense <= 0) {
                    gameState.playerField = gameState.playerField.filter(c => c.id !== targetCard.id);
                    targetElement?.remove();
                    addBattleLog(`${targetCard.name} 被摧毀了`);
                } else {
                    targetElement.querySelector('.defense').textContent = targetCard.defense;
                }

                const attackerElement = document.querySelector(`.opponent-field .card[data-card-id="${card.id}"]`);
                if (card.defense <= 0) {
                    gameState.opponentField = gameState.opponentField.filter(c => c.id !== card.id);
                    attackerElement?.remove();
                    addBattleLog(`${card.name} 被摧毀了`);
                }
            } else {
                // 直接攻擊玩家
                gameState.playerHealth -= card.attack;
                addBattleLog(`對手的 ${card.name} 直接攻擊了你，造成 ${card.attack} 點傷害`);
                updateGameUI();

                if (gameState.playerHealth <= 0) {
                    Swal.fire('遊戲結束', '你輸了！', 'error').then(() => {
                        location.reload();
                    });
                }
            }
        });
        
        endTurn();
    }, 1000);
}

// 結束回合
function endTurn() {
    gameState.isPlayerTurn = !gameState.isPlayerTurn;
    
    if (gameState.isPlayerTurn) {
        gameState.maxMana = Math.min(10, gameState.maxMana + 1);
        gameState.currentMana = gameState.maxMana;
        gameState.drawCountThisTurn = 0;
        // 重置所有卡牌的攻擊狀態
        gameState.playerField.forEach(card => card.canAttack = true);
        drawCard();
        addBattleLog("你的回合開始了");
    } else {
        drawCard(true);
        opponentTurn();
    }
    
    // 清理任何選中狀態
    cleanupAttackState();
    updateGameUI();
}

// 初始化遊戲
function initGame() {
    console.log('Game initializing...');
    
    // 確保所有狀態重置
    Object.assign(gameState, {
        playerHealth: 30,
        opponentHealth: 30,
        playerHand: [],
        playerField: [],
        opponentHand: [],
        opponentField: [],
        isPlayerTurn: true,
        maxMana: 1,
        currentMana: 1,
        drawCountThisTurn: 0,
        selectedCard: null,
        isInitialDraw: true
    });

    updateGameUI();
    
    // 初始抽牌
    console.log('Drawing initial cards...');
    for (let i = 0; i < 4; i++) {
        drawCard();
        drawCard(true);
    }
    gameState.isInitialDraw = false;

    // 綁定按鈕事件
    const drawButton = document.getElementById('draw-card');
    const endTurnButton = document.getElementById('end-turn');

    // 移除舊的事件監聽器（如果有的話）
    drawButton.removeEventListener('click', handleDrawCard);
    endTurnButton.removeEventListener('click', handleEndTurn);

    // 添加新的事件監聽器
    drawButton.addEventListener('click', handleDrawCard);
    endTurnButton.addEventListener('click', handleEndTurn);

    // 添加全局點擊事件來取消選擇
    document.removeEventListener('click', handleGlobalClick);
    document.addEventListener('click', handleGlobalClick);

    console.log('Game initialized');
    addBattleLog("遊戲開始！");
}

// 事件處理函數
function handleDrawCard() {
    if (gameState.isPlayerTurn) {
        drawCard();
    }
}

function handleEndTurn() {
    if (gameState.isPlayerTurn) {
        endTurn();
    }
}

function handleGlobalClick(e) {
    if (e.target.classList.contains('card') || 
        e.target.closest('.card') || 
        e.target.classList.contains('opponent-stats')) {
        return;
    }
    cleanupAttackState();
}

// 啟動遊戲
window.addEventListener('load', () => {
    console.log('Window loaded, starting game...');
    initGame();
});