// 전설 카드 시나리오 테스트: node tests/legend.js (결과 JSON, errors가 비어 있어야 함)
const openBench = require('./load');
(async () => {
  const { page, errors, cleanup } = await openBench();
  const ev = (code) => page.evaluate(c => window.__bench.ev(c), code);
  const res = {};
  // 시작 카드 선택: 전설 카드만, 흑·백 순서
  res.startDraft = await ev(`(() => {
    mode = 'local'; init();
    const a = { open: draftOpen, player: draftPlayer, picks: lastDraft.picks.map(c => c.id), legend: lastDraft.picks.every(c => c.legend), title: draftTitle.textContent };
    pickCardIntoHand(lastDraft.picks[0]); // 흑 전설
    const b = { open: draftOpen, player: draftPlayer, picks: lastDraft.picks.map(c => c.id) };
    pickCardIntoHand(lastDraft.picks[1]); // 백 전설
    return { a, b, cards: lg.card, hands: [hand[1].length, hand[2].length], q: startupQueue, slot: document.getElementById('legend-slot-1').textContent };
  })()`);
  // 이후 카드 선택에는 전설 카드가 안 나옴 (300번)
  res.laterDraft = await ev(`(() => { let leg = 0; for (let i = 0; i < 300; i++) { startupQueue = null; const p = weightedSample(getCardPool(), 3); if (p.some(c => c.legend)) leg++; } return { leg, napInLocal: (() => { let n = 0; for (let i = 0; i < 200; i++) if (legendPicks().some(c => c.id === 'nap')) n++; return n; })() }; })()`);
  const setup = `const fresh = (cur) => { mode = 'local'; init(); draftOpen = false; startupQueue = null; pendingTarget = null; cardAnimInstant = true; draftOverlay.classList.remove('show'); current = cur || 1; setMap('classic'); };
    const put = (list, v) => list.forEach(([r, c]) => { board[r][c] = v; });`;
  // 거신병
  res.obelisk = await ev(`(() => { ${setup}
    fresh(1); lg.card[1] = 'obelisk'; put([[0,0],[0,2],[0,4],[10,10]], 1); put([[5,1],[5,3],[5,6],[5,9],[8,8]], 2);
    const ok = lgProgress(1).ok; activateLegend(1);
    const tgt = pendingTarget && pendingTarget.type;
    handleTargetClick({r:0,c:0}); handleTargetClick({r:0,c:2}); handleTargetClick({r:0,c:4});
    return { ok, tgt, row5: board[5].filter(v => v === 2).length, my: countStones(1), white: countStones(2), done: lg.done[1], pend: !!pendingTarget, cur: current, lostW: lg.lost[2] };
  })()`);
  // 무소유: 상대 카드에 대응해 무효 (내 패 전부 버림, 패 없으면 불가, 차례는 그대로) — 로컬은 창에서 고름, 봇은 스스로 판단
  res.nothing = await ev(`(() => { ${setup}
    fresh(1); lg.card[2] = 'nothing'; put([[5,5]], 2); hand[2] = [CARD_POOL[0], CARD_POOL[1]];
    hand[1] = [CARD_POOL.find(c => c.id === 'bomb')]; activateCard(1, 0);
    const asked = !document.getElementById('counter-box').hidden;
    document.getElementById('counter-yes').click();
    const yes = { asked, white55: board[5][5], whiteHand: hand[2].length, blackHand: hand[1].length, cur: current, done: lg.done[2], pend: !!pendingTarget, log: fmt(logLines[0]) };
    fresh(1); lg.card[2] = 'nothing'; put([[5,5]], 2); hand[2] = [];
    hand[1] = [CARD_POOL.find(c => c.id === 'bomb')]; activateCard(1, 0);
    const emptyHand = { asked: !document.getElementById('counter-box').hidden, pend: !!pendingTarget };
    cancelTarget();
    fresh(1); mode = 'bot'; myColor = 1; lg.card[2] = 'nothing'; hand[2] = [CARD_POOL[1]];
    hand[1] = [CARD_POOL.find(c => c.id === 'chain')]; activateCard(1, 0);
    const bot = { need: turnPlacementsNeeded, botHand: hand[2].length, done: lg.done[2] };
    return { yes, emptyHand, bot };
  })()`);
  // 대기만성: 40수, 5번 착수, 승리 줄 금지
  res.latebloom = await ev(`(() => { ${setup}
    fresh(1); lg.card[1] = 'latebloom'; lg.plies = 40; put([[7,3],[7,4],[7,5],[7,6]], 1);
    activateLegend(1);
    const need = turnPlacementsNeeded;
    handlePlace({r:7,c:7}); const blockedWin = board[7][7];
    handlePlace({r:7,c:2}); const blockedWin2 = board[7][2];
    [[1,1],[1,2],[1,3],[1,4],[1,5]].forEach(([r,c]) => handlePlace({r,c}));
    return { need, blockedWin, blockedWin2, row1: board[1].filter(v => v === 1).length, cur: current, over: gameOver, big: lg.big };
  })()`);
  // 눈 감고 두기: 사용한 턴부터 3턴 동안 판 암전
  res.blind = await ev(`(() => { ${setup}
    fresh(1); lg.card[1] = 'blind'; lg.far[1] = 3; put([[7,7]], 2);
    activateLegend(1);
    const seq = [isDark()];
    for (let k = 0; k < 3; k++) { turnPlacementsDone = 1; passTurn(); seq.push(isDark()); }
    return { seq, done: lg.done[1] };
  })()`);
  // 광대: 폭파 3번 당한 뒤 귀환 (한 자리는 백 돌이 차지 → 밀려남)
  res.clown = await ev(`(() => { ${setup}
    fresh(2); lg.card[1] = 'clown'; put([[3,3],[3,5],[3,7]], 1);
    for (const [r,c] of [[3,3],[3,5],[3,7]]) { current = 2; usedCardThisTurn[2] = false; hand[2] = [CARD_POOL.find(c => c.id === 'bomb')]; activateCard(2,0); handleTargetClick({r,c}); }
    craterList = []; board[3][5] = 2; current = 1;
    const lost = lg.lost[1]; activateLegend(1);
    return { lost, a: board[3][3], b: board[3][5], c: board[3][7], whites: countStones(2) };
  })()`);
  // 치킨 게임
  res.chicken = await ev(`(() => { ${setup}
    let win = 0, lose = 0;
    for (let i = 0; i < 40; i++) {
      fresh(1); lg.card[1] = 'chicken'; put([[2,2],[2,3],[2,4]], 1); put([[9,2],[9,3],[9,4],[9,5]], 2);
      activateLegend(1);
      if (countStones(2) === 0 && countStones(1) === 3) win++; else if (countStones(1) === 0 && countStones(2) === 4) lose++;
    }
    return { win, lose };
  })()`);
  // 나무늘보: 들고 있으면 카드 선택이 무작위, 카드 없이 6턴 → 패 전부 즉시 발동 (대상 무작위)
  res.sloth = await ev(`(() => { ${setup}
    fresh(1); lg.card[1] = 'sloth';
    openDraft(1); const draftUi = draftOpen, gotRandom = hand[1].length;
    lg.edge[1] = 6; current = 1; turnPlacementsDone = 0; usedCardThisTurn[1] = false;
    put([[7,7],[7,9]], 2); put([[3,3]], 1);
    hand[1] = ['wall', 'bomb', 'chain'].map(id => CARD_POOL.find(c => c.id === id));
    const ok = lgProgress(1).ok; activateLegend(1);
    return { draftUi, gotRandom, ok };
  })()`);
  await page.waitForTimeout(800);
  res.slothAfter = await ev(`({ hand: hand[1].length, walls: board.flat().filter(v => v === WALL).length, whites: countStones(2), need: turnPlacementsNeeded, cur: current, done: lg.done[1], running: !!slothRun, log: logLines.slice(0, 4).map(fmt) })`);
  // 따라쟁이: 상대가 가장 최근에 쓴 카드를 베껴 내 패에
  res.mirror = await ev(`(() => { ${setup}
    fresh(2); hand[2] = [CARD_POOL.find(c => c.id === 'chain')]; activateCard(2, 0);
    current = 1; usedCardThisTurn[1] = false; turnPlacementsNeeded = 1; turnPlacementsDone = 0; hand[1] = []; lg.card[1] = 'mirror';
    const ok = lgProgress(1).ok; activateLegend(1);
    return { ok, hand: hand[1].map(c => c.id), used: usedCardThisTurn[1], cur: current };
  })()`);
  // 올인: 패 전부 또는 돌 3개를 걸고 50% 잭팟이면 2배로
  res.allin = await ev(`(() => { ${setup}
    const cards = { win: 0, lose: 0 }, stones = { win: 0, lose: 0 };
    for (let k = 0; k < 30; k++) {
      fresh(1); lg.card[1] = 'allin'; hand[1] = [CARD_POOL[0], CARD_POOL[1]];
      activateLegend(1); // 돌이 없으면 바로 패를 검
      if (hand[1].length === 4) cards.win++; else if (hand[1].length === 0) cards.lose++;
    }
    for (let k = 0; k < 30; k++) {
      fresh(1); lg.card[1] = 'allin'; hand[1] = []; put([[7,7],[7,9],[9,7],[3,3]], 1);
      activateLegend(1); handleTargetClick({ r: 7, c: 7 }); handleTargetClick({ r: 7, c: 9 }); handleTargetClick({ r: 9, c: 7 });
      const n = countStones(1); if (n === 7) stones.win++; else if (n === 1) stones.lose++;
    }
    fresh(1); lg.card[1] = 'allin'; hand[1] = [CARD_POOL[0]]; put([[7,7],[7,9],[9,7]], 1);
    activateLegend(1); const asked = !document.getElementById('counter-box').hidden, buttons = document.querySelectorAll('#counter-box .counter-actions button').length;
    document.querySelectorAll('#counter-box .counter-actions button')[2].click();
    return { cards, stones, asked, buttons, cancelledDone: lg.done[1], restored: document.querySelectorAll('#counter-box .counter-actions button').length };
  })()`);
  // 토끼와 거북이
  res.turtle = await ev(`(() => { ${setup}
    fresh(1); lg.card[1] = 'turtle'; put([[0,0],[2,2],[2,3],[2,4]], 1); put([[9,0],[9,2],[9,4],[9,6],[9,8],[9,10],[11,1],[11,3],[11,5],[11,7]], 2);
    const ok = lgProgress(1).ok; activateLegend(1);
    const cur = current, wo = winOver[1], over1 = gameOver;
    handlePlace({r:12,c:12});
    handlePlace({r:2,c:5});
    return { ok, cur, wo, over1, over: gameOver, winner: scanBoardForWin() && scanBoardForWin().player, badge: winLenBadge.textContent };
  })()`);
  // 왕의 귀환: 왕 지정 → 20턴 살아남으면 패 가득 + 새 전설 / 왕이 쓰러지면 실패
  res.king = await ev(`(() => { ${setup}
    fresh(1); lg.card[1] = 'king'; put([[7,7]], 1);
    activateLegend(1); const tgt = pendingTarget && pendingTarget.type; handleTargetClick({ r: 7, c: 7 });
    const set = lg.king[1];
    for (let k = 0; k < 21; k++) { turnPlacementsDone = 1; passTurn(); }
    const ret = { hand: hand[1].length, newCard: lg.card[1], done: lg.done[1], king: lg.king[1] };
    fresh(1); lg.card[1] = 'king'; put([[7,7]], 1); activateLegend(1); handleTargetClick({ r: 7, c: 7 });
    board[7][7] = EMPTY; for (let k = 0; k < 2; k++) { turnPlacementsDone = 1; passTurn(); }
    return { tgt, set, ret, lost: lg.king[1], noNap: !LEGEND_POOL.some(c => c.id === 'nap') };
  })()`);
  // 상대가 4목 승리면 봇이 막음 (lgUrgentMove)
  res.urgent = await ev(`(() => { ${setup}
    fresh(1); winOver[2] = 4; put([[4,4],[4,5],[4,6]], 2); board[4][3] = 1;
    return lgUrgentMove(1);
  })()`);
  // 전설 카드 비공개: 봇전에서 봇의 전설은 쓰기 전까지 안 보이고, 쓰면 공개
  res.hidden = await ev(`(() => { ${setup}
    fresh(1); mode = 'bot'; myColor = 1; lg.card[1] = 'king'; lg.card[2] = 'obelisk'; updateHandUI();
    const before = { mine: document.getElementById('legend-slot-1').textContent, bot: document.getElementById('legend-slot-2').textContent };
    lg.done[2] = true; updateHandUI();
    const after = document.getElementById('legend-slot-2').textContent;
    mode = 'local'; current = 1; lg.done[2] = false; updateHandUI();
    const local = { cur: document.getElementById('legend-slot-1').textContent, other: document.getElementById('legend-slot-2').textContent };
    return { before, after, local };
  })()`);
  res.errors = errors;
  console.log(JSON.stringify(res, null, 1));
  await cleanup();
})();
