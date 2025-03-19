const express = require('express');
const app = express();
const http = require('http');
const Game = require('./game');
const { MIMEType } = require('util');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
// const { dealerTipTotal, updateDealerTip } = require('./gameState');

const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    withCredentials: false
  },
});

let dealerTipTotal = 0; // 하루 동안 모인 딜러팁 총액
let totalGameTime = 0;  // 하루 동안 게임 이용 시간(분)
let totalTTRReward = 0; // 하루 지급된 TTR 총량
let gameStartTime = {}; // 게임 시작 시간을 저장하는 객체

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '1.201.161.233',  // 현재 사용 중인 PostgreSQL 호스트
  database: 'sotong',
  password: 'postgres',
  port: 5432,
});

/**
 * 특정 유저의 지갑 주소를 API에서 조회하는 함수
 * @param {string} userkey - 유저 key
 * @returns {Promise<string|null>} - 지갑 주소 반환 (없으면 null)
 */
// async function getWalletAddress(userkey) {
//   const apiUrl = `https://api.otongtong.net/v1/api/external/passtong/coin-info?userkey=${userkey}`;
//   // const apiUrl = `https://api.otongtong.net/v1/api/external/passtong/coin-info?userkey=1722474521!usr-e3ca96b6-0e3a-4e37-ad01-72ba671aabb1`;

//   try {
//     const response = await axios.get(apiUrl);

//     // if (response.status === 200 && response.data.wallet_addr) {
//     if (response.status === 200) {
//       console.log(` 지갑 주소 조회 성공! 사용자: ${userkey}, 주소: ${response.data.value.wallet_addr}`);
//       // console.log(` 지갑 주소 조회 성공! 사용자1: ${userkey}, 주소1: ${response.data.value.wallet_addr}`);
//       return response.data.value.wallet_addr;
//     } else {
//       console.warn(` 사용자 ${userkey}의 지갑 주소 조회 실패`);
//       return null;
//     }
//   } catch (error) {
//     console.error(` API 오류: 사용자 ${userkey}의 지갑 주소 조회 실패`, error.message);
//     return null;
//   }
// }


/**
 * 특정 유저에게 TTR 리워드를 지급하는 API 호출 함수
 * @param {string} userWalletAddress - 리워드를 받을 유저의 지갑 주소
 * @param {number} amount - 지급할 TTR 리워드 금액
 * @param {number} retryCount - API 실패 시 최대 재시도 횟수 (기본값: 3)
 * 
 * 
 */
// async function sendRewardToUser(userWalletAddress, amount, retryCount = 3) {
//   if (!userWalletAddress) {
//     console.error(" 지갑 주소 없음: API 호출 취소");
//     return;
//   }

//   const apiUrl = 'http://1.201.162.165:9000/api/v1/wallet_transfer_to_address';
//   const apiKey = '1AA75CC269F33FB15479233CAC6705D2DD0016072F561E1547E4BF731C49C6FD';

//   for (let attempt = 1; attempt <= retryCount; attempt++) {
//     try {
//       const response = await axios.post(apiUrl, qs.stringify({
//         amount_to_transfer: amount,
//         to_address: userWalletAddress
//       }), {
//         headers: {
//           'Authorization': apiKey,
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       });

//       if (response.status === 200) {
//         console.log(` 리워드 지급 성공! 사용자: ${userWalletAddress}, 지급액: ${amount}`);
//         return;
//       } else {
//         console.error(` 리워드 지급 실패 (상태 코드: ${response.status})`, response.data);
//       }
//     } catch (error) {
//       console.error(` 리워드 지급 API 호출 오류 (시도 ${attempt}/${retryCount}): 사용자 ${userWalletAddress}`, error.message);
//     }

// 일정 시간 대기 후 재시도 (2초)
//     if (attempt < retryCount) {
//       console.log(` ${userWalletAddress}의 리워드 지급 재시도 중...`);
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }
//   }

//   console.error(` ${userWalletAddress}에게 리워드 지급 실패 (최대 ${retryCount}회 시도)`);
// }


/**
 * 특정 유저에게 TTR 리워드를 지급하는 API 호출 함수
 * @param {string} userkey - 리워드를 받을 유저키 
 */
async function RewoadToUser(userkey) {
  const apiUrl = 'https://svr.sotong.com/api/v1/rewards/game';
  const data = {
    "userkey": userkey,
  };

  try {
    const response = await axios.post(apiUrl, data);

    if (response.status === 200) {
      console.log(`리워드 지급 성공! 사용자: ${userkey}`);
      return;
    } else {
      console.error(`리워드 지급 실패 (상태 코드: ${response.status})`, response.data);
    }
  } catch (error) {
    console.error(` 리워드 지급 API 호출 오류 ${error}`);
  }
}

app.use('/assets', express.static(__dirname + '/assets'));

let game = new Map();

app.get('/', (req, res) => {
  const { name, nyang, userkey } = req.query;

  console.log(`Player Name: ${name}, Bet: ${nyang}`);

  const filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      console.error("Error reading HTML file:", err);
      res.status(500).send("Error loading page");
      return;
    }

    const updatedHtml = html.replace(
      '<script id="server-data"></script>',
      `<script id="server-data">        
        const playerName = "${name}";
        const nyang = ${nyang};        
        const userkey = "${userkey}"; 
      </script>`
    );

    res.send(updatedHtml);
  });
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

/**
 * 리워드 함수
 */
let rewardIntervalId = null; // 리워드 지급 타이머 ID
let isRewarding = true; // 리워드 지급 여부

// 🔹 리워드 지급 함수 (1분마다 실행)
function startRewarding(userkey) {
  if (!isRewarding) return;
  console.log(`🎁 RewoadToUser() 실행 (유저: ${userkey})`);
  RewoadToUser(userkey);
}

//1분마다 리워드 지급 (초기 실행)
function startRewardInterval(userkey) {
  if (rewardIntervalId) clearInterval(rewardIntervalId); // 기존 타이머 제거
  rewardIntervalId = setInterval(() => startRewarding(userkey), 60000);
}



//  모든 사용자에게 방 리스트 전송하도록 수정 (가장 안정적인 방법)
// function updateUserRoomList() {
//   for (let [id, socket] of io.of("/").sockets) {
//       const userRoomNames = Object.values(socket.roomNames || {});
//       console.log(`Sending room list to ${id}:`, userRoomNames);  //  디버깅용
//       socket.emit('room_list', userRoomNames); //  각 사용자의 클라이언트로 전송
//   }
// }


//  모든 사용자에게 동일한 방 리스트 전송
function updateUserRoomList() {
  const rooms = Array.from(io.sockets.adapter.rooms.entries());
  const roomData = rooms.map(([roomId, sockets]) => ({
    id: roomId,
    count: sockets.size, //  현재 방의 인원 수
  })).filter(room => !io.sockets.adapter.sids.has(room.id)); // 개인 소켓 제외

  console.log('Broadcasting room list:', roomData);
  io.emit('room_list', roomData); //  모든 클라이언트에게 방 리스트 전송
}

let inactiveUsers = new Set(); // ⛔ 비활성 사용자 리스트
let intervalIdMap = new Map(); // 🔹 각 사용자별 setInterval ID 저장

io.on('connection', (socket) => {
  const referer = socket.handshake.headers.referer;
  const urlParams = new URLSearchParams(new URL(referer).search);
  const name = urlParams.get('name');
  const userkey = urlParams.get('userkey');
  const nyang = urlParams.get('nyang');


  if (!userkey) {
    console.warn(`유저(${socket.id})의 userkey가 없음. 리워드 지급을 건너뜀.`);
    return;
  }

  console.log(`🔹 유저(${socket.id})의 userkey: ${userkey}`);

  // 🛑 사용자가 3분 동안 입력이 없을 때 리워드 지급 중지
  socket.on("stop_rewards", () => {
    console.log(`🛑 [서버] ${socket.id} 사용자가 비활성 상태로 감지됨, 리워드 지급 중단`);
    inactiveUsers.add(userkey);
    console.log(`📌 [서버] 현재 비활성 사용자 목록:`, inactiveUsers);

    // ⛔ 기존 setInterval 종료
    if (intervalIdMap.has(userkey)) {
      console.log(`⏹️ [서버] ${userkey}의 리워드 지급 타이머 중지됨.`);
      clearInterval(intervalIdMap.get(userkey));
      intervalIdMap.delete(userkey);
    }
  });

  // ✅ 사용자가 다시 활동하면 리워드 지급 재개
  socket.on("resume_rewards", () => {
    if (inactiveUsers.has(userkey)) {
      console.log(`✅ [서버] ${userkey}가 다시 활동 시작, 리워드 지급 재개`);
      inactiveUsers.delete(userkey); // 비활성 상태 해제
      console.log(`📌 [서버] 업데이트된 활성 사용자 목록:`, inactiveUsers);

      // ⏳ 리워드 지급 타이머 다시 시작
      const intervalId = setInterval(async () => {
        if (inactiveUsers.has(userkey)) {
          console.log(`⏸️ [서버] 비활성 사용자 ${userkey}, 리워드 지급 스킵`);
          return;
        }

        console.log(`💰 [서버] 1분마다 RewoadToUser() 실행 (유저: ${userkey})`);
        await RewoadToUser(userkey);
      }, 60000);

      intervalIdMap.set(userkey, intervalId);
    }
  });

  // 🔹 1분마다 실행하는 리워드 API 호출 로직 (비활성 사용자 제외)
  if (!intervalIdMap.has(userkey)) {
    const intervalId = setInterval(async () => {
      if (inactiveUsers.has(userkey)) {
        console.log(`⏸️ [서버] 비활성 사용자 ${userkey}, 리워드 지급 스킵`);
        return;
      }

      console.log(`💰 [서버] 1분마다 RewoadToUser() 실행 (유저: ${userkey})`);
      await RewoadToUser(userkey);
    }, 60000);

    intervalIdMap.set(userkey, intervalId);
  }

  socket.roomNames = {}; //  사용자가 입력한 방 번호 저장 객체  

  //  사용자가 접속 시 현재 속한 방 리스트 전송
  updateUserRoomList();


  socket.playerName = name;
  console.log('A user connected: ' + name);

  socket.emit('welcome', {
    id: socket.id,
    username: name
  });

  //  사용자가 방에 입장할 때 입력한 방 번호 저장 및 리스트 업데이트
  socket.on('room_join', ({ id }) => {
    let room = io.sockets.adapter.rooms.get(id);
    if (room != null) {
      let roomSize = room.size;
      console.log(`room<${id}> user length = ${roomSize}`);
      if (roomSize >= 3) {
        socket.emit('room_join', {
          result: "fail",
          error: "full"
        });
        return;
      }
    }

    socket.join(id);
    socket.roomNames[id] = id;
    console.log(`User ${socket.id} joined room ${id}`);

    let users = Array.from(io.sockets.adapter.rooms.get(id) || []);
    let userNames = users.map(socketId => io.sockets.sockets.get(socketId)?.playerName || "Unknown");

    io.sockets.in(id).emit('user_info', {
      users,
      userNames,   // 🔥 이름 추가
      count: users.length
    });

    socket.emit('room_join', {
      result: "success"
    });

    updateUserRoomList();
  });


  socket.on("uuid_save", (gameUuid) => {
    console.log(` 유저(${socket.id})의 gameUuid 저장: ${gameUuid}`);
    socket.gameUuid = gameUuid;
  });


  socket.on("uuid_response", (gameUuid) => {
    if (gameUuid) {
      console.log(` 서버에서 받은 gameUuid: ${gameUuid}`);
      storedGameUuid = gameUuid; // 🔹 변수에 저장
    } else {
      console.warn(" 서버에서 gameUuid를 찾을 수 없음.");
    }
  });

  socket.on("get_uuid", () => {
    if (socket.gameUuid) {
      console.log(` 유저(${socket.id})의 gameUuid 반환: ${socket.gameUuid}`);
      socket.emit("uuid_response", socket.gameUuid);
    } else {
      console.warn(`유저(${socket.id})의 gameUuid 없음`);
      socket.emit("uuid_response", null);
    }
  });


  //  사용자가 방에서 나갈 때 해당 방 번호 삭제
  socket.on('room_leave', ({ id }) => {
    socket.leave(id);
    delete socket.roomNames[id];
    console.log(`User ${socket.id} left room ${id}`);

    let users = io.sockets.adapter.rooms.get(id) || [];
    io.sockets.in(id).emit('user_info', {
      users: Array.from(users),
      count: users.length,
      id: id,
    });

    socket.emit('room_leave', { result: "success" });
    updateUserRoomList(); //  모든 사용자에게 전송
  });

  socket.on("game_start", () => {
    let roomId = Array.from(socket.rooms)[1];
    let users = io.sockets.adapter.rooms.get(roomId);
    console.log(`GAME START, room id = ${roomId}, users len = ${users.size}`);

    if (!game.has(roomId)) {
      game.set(roomId, new Game());
    }

    game.get(roomId).init();
    game.get(roomId).start(io, Array.from(users), roomId);

    // 게임 시작 시간 기록
    gameStartTime[roomId] = Date.now();
  });

  socket.on('betting-done', () => {
    let roomId = Array.from(socket.rooms)[1];
    let users = io.sockets.adapter.rooms.get(roomId);
    game.get(roomId).betting(io, Array.from(users), roomId);
  });

  socket.on('hit', ({ id, isEnd }) => {
    let roomId = Array.from(socket.rooms)[1];
    let users = io.sockets.adapter.rooms.get(roomId);
    game.get(roomId).hit(io, id, isEnd, roomId);
  });

  socket.on('endturn', ({ }) => {
    let roomId = Array.from(socket.rooms)[1];
    let users = io.sockets.adapter.rooms.get(roomId);
    game.get(roomId).endturn(io, Array.from(users), roomId);

    if (gameStartTime[roomId]) {
      let playTime = (Date.now() - gameStartTime[roomId]) / 60000;
      totalGameTime += playTime;
      // saveGameSession(roomId, playTime, dealerTipTotal); //  DB에 게임 기록 저장
      delete gameStartTime[roomId];
    }
  });


  socket.on('doubledown', ({ id, isEnd }) => {
    let roomId = Array.from(socket.rooms)[1];
    let users = io.sockets.adapter.rooms.get(roomId);
    game.get(roomId).doubleDown(io, id, isEnd, roomId);
  });

  socket.on('splitcard', ({ id }) => {
    let roomId = Array.from(socket.rooms)[1];
    io.sockets.in(roomId).emit('splitcard', {
      id: id
    });
  });

  socket.on('disconnecting', () => {
    Object.keys(socket.roomNames).forEach(roomId => {
      delete socket.roomNames[roomId]; //  사용자가 떠날 때 모든 방 제거
    });
    console.log(`User ${socket.id} disconnecting.`);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected.`);
    updateUserRoomList(); //  사용자가 접속 종료 시 리스트 업데이트
    if (intervalIdMap.has(userkey)) {
      clearInterval(intervalIdMap.get(userkey)); // 사용자가 나가면 리워드 중지
      intervalIdMap.delete(userkey);
    }
  });
});

// function calculateTTRReward() {
//   if (totalGameTime > 0) {
//     let ttrPerMinute = (dealerTipTotal * 0.7) / totalGameTime;
//     return Math.max(ttrPerMinute, 16.6); // 최소 16.6원 보장
//   }
//   return 16.6; // 첫날 기본 지급
// }


// setInterval(() => {
//   let ttrAmount = calculateTTRReward();
//   distributeTTR(ttrAmount);
// }, 60000); // 1분마다 실행

// function resetDailyTTR() {
//   dealerTipTotal = 0;
//   totalGameTime = 0;
//   totalTTRReward = 0;
//   console.log(" TTR 데이터 초기화 완료!");
// }

// setInterval(() => {
//   let now = new Date();
//   if (now.getHours() === 0 && now.getMinutes() === 0) {
//     resetDailyTTR();
//   }
// }, 60000); // 매 1분마다 실행하여 자정 확인

// async function saveGameSession(roomId, totalPlayTime, dealerTipTotal) {
//   try {
//     let ttrPerMinute = dealerTipTotal > 0 ? (dealerTipTotal * 0.7) / (totalPlayTime / 60) : 16.6;

//     const query = `
//           INSERT INTO game_sessions (room_id, start_time, end_time, total_play_time, total_dealer_tips, ttr_per_minute)
//           VALUES ($1, NOW(), NOW(), $2, $3, $4)
//       `;
//     await pool.query(query, [roomId, totalPlayTime, dealerTipTotal, ttrPerMinute]);

//     console.log(` 게임 세션 저장 완료: ${roomId}, TTR 지급량: ${ttrPerMinute}`);
//   } catch (error) {
//     console.error(" 게임 세션 저장 실패:", error);
//   }
// }

// async function distributeTTR() {
//   try {
//     const query = `
//             SELECT 
//                 GREATEST((SUM(total_dealer_tips) * 0.7) / NULLIF(SUM(EXTRACT(EPOCH FROM total_play_time) / 60), 0), 16.6) AS ttr_per_minute
//             FROM game_sessions
//             WHERE created_at >= CURRENT_DATE;
//         `;
//     const { rows } = await pool.query(query);
//     const ttrPerMinute = rows[0]?.ttr_per_minute || 16.6;

//     console.log(` 1분당 ${ttrPerMinute} TTR 지급`);

//     for (let [socketId, socket] of io.sockets.sockets) {
//       // const userId = socketId; // 유저 ID로 사용
//       const walletAddress = await getWalletAddress(userkey); //  API에서 지갑 주소 조회

//       if (walletAddress) {
//         await pool.query(`
//                     INSERT INTO ttr_rewards (user_id, reward_amount)
//                     VALUES ($1, $2)
//                 `, [userkey, ttrPerMinute]);

//         //  API 호출하여 실제로 리워드 지급
//         await sendRewardToUser(walletAddress, ttrPerMinute);
//       } else {
//         console.warn(` 사용자 ${userkey}의 지갑 주소 없음, 리워드 지급 생략`);
//       }
//     }

//     console.log(` ${io.sockets.sockets.size}명에게 TTR 지급 완료`);
//   } catch (error) {
//     console.error(" TTR 지급 실패:", error);
//   }
// }


// // 1분마다 실행
// setInterval(distributeTTR, 60000);


// async function resetDailyTTR() {
//   try {
//     console.log(" TTR 데이터 초기화 시작");

//     await pool.query(`
//           INSERT INTO game_sessions (room_id, start_time, end_time, total_play_time, total_dealer_tips, ttr_per_minute)
//           SELECT NULL, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, SUM(total_play_time), SUM(total_dealer_tips), AVG(ttr_per_minute)
//           FROM game_sessions
//           WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
//       `);

//     console.log(" 하루 TTR 데이터 저장 완료");

//     await pool.query(`DELETE FROM game_sessions WHERE created_at < CURRENT_DATE;`);

//     console.log(" 게임 세션 데이터 리셋 완료");
//   } catch (error) {
//     console.error(" TTR 데이터 리셋 실패:", error);
//   }
// }

// // 자정마다 실행
// setInterval(() => {
//   let now = new Date();
//   if (now.getHours() === 0 && now.getMinutes() === 0) {
//     resetDailyTTR();
//   }
// }, 60000);

server.listen(3001, () => {
  console.log('tomato BLACKJACK◇♠♡♣ server listening on *:3001');
});

// setInterval(() => {
//   console.log(` 현재까지 모인 딜러팁: ${dealerTipTotal}`);
// }, 60000); // 1분마다 출력

// function updateDealerTip(amount) {
//   dealerTipTotal += amount;
//   console.log(` 딜러팁 업데이트됨: 현재 총 딜러팁 ${dealerTipTotal}`);
// }

// module.exports = {
//   dealerTipTotal,
//   updateDealerTip
// };

