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
    currentMana: 1
};

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
    const logEntry = document.createElement('div');
    logEntry.textContent = `${message}`;
    logContent.insertBefore(logEntry, logContent.firstChild);
    
    // 保持最多顯示10條記錄
    while (logContent.children.length > 10) {
        logContent.removeChild(logContent.lastChild);
    }
}

// 卡牌資料庫
const cardDatabase = [
    { id: 1, name: '勇士', attack: 2, defense: 2, cost: 1 },
    { id: 2, name: '弓箭手', attack: 1, defense: 1, cost: 1 },
    { id: 3, name: '騎士', attack: 3, defense: 3, cost: 2 },
    { id: 4, name: '法師', attack: 1, defense: 3, cost: 2 },
    { id: 5, name: '龍', attack: 5, defense: 4, cost: 3 }
];

// 建立卡牌元素
function createCardElement(card, isOpponent = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${isOpponent ? 'opponent-card' : ''} animate__animated animate__fadeIn`;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.location = isOpponent ? 'opponent-field' : 'player-field';
    
    cardElement.innerHTML = `
        <div class="name">${isOpponent ? card.name : card.name}</div>
        <div class="attack">${isOpponent ? card.attack : card.attack}</div>
        <div class="defense">${isOpponent ? card.defense : card.defense}</div>
    `;

    // 為場地上的卡牌添加點擊事件（攻擊用）
    if (cardElement.dataset.location === 'player-field') {
        cardElement.addEventListener('click', (e) => {
            e.stopPropagation();
            selectAttackingCard(card, cardElement);
        });
    }

    return cardElement;
}

// 選擇攻擊的卡牌
function selectAttackingCard(card, cardElement) {
    if (!gameState.isPlayerTurn) return;
    
    // 檢查卡牌是否在場上
    if (!gameState.playerField.includes(card)) return;
    
    // 取消之前選擇的卡牌
    document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
    
    if (card.canAttack) {
        cardElement.classList.add('selected');
        setupAttackTargets();
    } else {
        addBattleLog("這張卡牌本回合已經攻擊過了");
    }
}

// 設置可攻擊目標
function setupAttackTargets() {
    // 移除之前的目標監聽器
    document.querySelectorAll('.opponent-field .card').forEach(card => {
        card.classList.add('valid-target');
        card.addEventListener('click', handleAttack);
    });
    
    // 如果對手場上沒有卡牌，可以直接攻擊對手
    if (gameState.opponentField.length === 0) {
        const opponentStats = document.querySelector('.opponent-stats');
        opponentStats.classList.add('valid-target');
        opponentStats.addEventListener('click', handleDirectAttack);
    }
}

// 處理卡牌攻擊
function handleAttack(event) {
    const attackingCard = document.querySelector('.card.selected');
    if (!attackingCard) return;

    const attackingCardData = gameState.playerField.find(
        card => card.id === parseInt(attackingCard.dataset.cardId)
    );
    const defendingCardElement = event.currentTarget;
    const defendingCardData = gameState.opponentField.find(
        card => card.id === parseInt(defendingCardElement.dataset.cardId)
    );

    // 執行戰鬥
    defendingCardData.defense -= attackingCardData.attack;
    attackingCardData.defense -= defendingCardData.attack;
    attackingCardData.canAttack = false;

    addBattleLog(`${attackingCardData.name}（${attackingCardData.attack}/${attackingCardData.defense}）攻擊了 ${defendingCardData.name}（${defendingCardData.attack}/${defendingCardData.defense}）`);

    // 更新卡牌顯示
    defendingCardElement.querySelector('.defense').textContent = defendingCardData.defense;
    attackingCard.querySelector('.defense').textContent = attackingCardData.defense;
    
    // 移除已死亡的卡牌
    if (defendingCardData.defense <= 0) {
        gameState.opponentField = gameState.opponentField.filter(c => c.id !== defendingCardData.id);
        defendingCardElement.remove();
        addBattleLog(`${defendingCardData.name} 被摧毀了`);
    }
    if (attackingCardData.defense <= 0) {
        gameState.playerField = gameState.playerField.filter(c => c.id !== attackingCardData.id);
        attackingCard.remove();
        addBattleLog(`${attackingCardData.name} 被摧毀了`);
    }

    // 清理戰鬥狀態
    cleanupAttackState();
}

// 處理直接攻擊
function handleDirectAttack() {
    const attackingCard = document.querySelector('.card.selected');
    if (!attackingCard) return;

    const attackingCardData = gameState.playerField.find(
        card => card.id === parseInt(attackingCard.dataset.cardId)
    );

    gameState.opponentHealth -= attackingCardData.attack;
    attackingCardData.canAttack = false;
    updateGameUI();

    addBattleLog(`${attackingCardData.name} 直接攻擊了對手，造成 ${attackingCardData.attack} 點傷害`);

    // 檢查遊戲結束
    if (gameState.opponentHealth <= 0) {
        Swal.fire('遊戲結束', '你贏了！', 'success').then(() => {
            location.reload();
        });
    }

    cleanupAttackState();
}

// 清理戰鬥狀態
function cleanupAttackState() {
    document.querySelectorAll('.card.selected, .valid-target').forEach(element => {
        element.classList.remove('selected', 'valid-target');
    });
    document.querySelectorAll('.opponent-field .card').forEach(card => {
        card.removeEventListener('click', handleAttack);
    });
    document.querySelector('.opponent-stats').removeEventListener('click', handleDirectAttack);
}

// 抽牌功能
function drawCard(isOpponent = false) {
    if ((isOpponent && gameState.opponentHand.length >= 7) || 
        (!isOpponent && gameState.playerHand.length >= 7)) {
        return;
    }

    const randomCard = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    const card = { ...randomCard };
    
    if (isOpponent) {
        gameState.opponentHand.push(card);
        const cardElement = createCardElement(card, true);
        cardElement.dataset.location = 'opponent-hand';
        document.querySelector('.opponent-hand').appendChild(cardElement);
        addBattleLog("對手抽了一張牌");
    } else {
        gameState.playerHand.push(card);
        const cardElement = createCardElement(card);
        cardElement.dataset.location = 'player-hand';
        cardElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (cardElement.dataset.location === 'player-hand') {
                playCard(card, cardElement);
            }
        });
        document.querySelector('.player-hand').appendChild(cardElement);
        addBattleLog("你抽了一張牌");
    }
}

// 打出卡牌
function playCard(card, cardElement) {
    if (!gameState.isPlayerTurn) {
        Swal.fire('請等待對手回合結束');
        return;
    }

    // 確認卡牌是在手牌中
    if (!gameState.playerHand.includes(card)) return;

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
    card.canAttack = false; // 剛放置的卡牌本回合不能攻擊
    gameState.playerField.push(card);
    
    cardElement.remove();
    const fieldCard = createCardElement(card);
    fieldCard.dataset.location = 'player-field';
    document.querySelector('.player-field').appendChild(fieldCard);
    
    addBattleLog(`你使用了 ${card.name}（${card.attack}/${card.defense}）`);
}

// AI對手的回合
function opponentTurn() {
    gameState.isPlayerTurn = false;
    addBattleLog("對手的回合開始了");
    
    // 簡單的AI邏輯
    setTimeout(() => {
        // 嘗試打出手牌
        if (gameState.opponentHand.length > 0 && gameState.opponentField.length < 5) {
            const card = gameState.opponentHand[0];
            gameState.opponentHand.shift();
            gameState.opponentField.push(card);
            
            document.querySelector('.opponent-hand').firstChild?.remove();
            const fieldCard = createCardElement(card, true);
            fieldCard.dataset.location = 'opponent-field';
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
        // 重置所有卡牌的攻擊狀態
        gameState.playerField.forEach(card => card.canAttack = true);
        drawCard();
        addBattleLog("你的回合開始了");
    } else {
        drawCard(true);
        opponentTurn();
    }
    
    updateGameUI();
}

// 初始化遊戲
function initGame() {
    updateGameUI();
    
    // 初始抽牌
    for (let i = 0; i < 4; i++) {
        drawCard();
        drawCard(true);
    }

    // 綁定按鈕事件
    document.getElementById('draw-card').addEventListener('click', () => {
        if (gameState.isPlayerTurn) {
            drawCard();
        }
    });

    document.getElementById('end-turn').addEventListener('click', () => {
        if (gameState.isPlayerTurn) {
            endTurn();
        }
    });
}

// 啟動遊戲
initGame();