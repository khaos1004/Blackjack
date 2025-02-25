const express = require('express');
const app = express();
const http = require('http');
const Game = require('./game');
const { MIMEType } = require('util');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    withCredentials: false
  },
});

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

// ✅ 모든 사용자에게 방 리스트 전송하도록 수정 (가장 안정적인 방법)
// function updateUserRoomList() {
//   for (let [id, socket] of io.of("/").sockets) {
//       const userRoomNames = Object.values(socket.roomNames || {});
//       console.log(`Sending room list to ${id}:`, userRoomNames);  // ✅ 디버깅용
//       socket.emit('room_list', userRoomNames); // ✅ 각 사용자의 클라이언트로 전송
//   }
// }

// ✅ 모든 사용자에게 동일한 방 리스트 전송
function updateUserRoomList() {
  const rooms = Array.from(io.sockets.adapter.rooms.entries());
  const roomData = rooms.map(([roomId, sockets]) => ({
    id: roomId,
    count: sockets.size, // ✅ 현재 방의 인원 수
  })).filter(room => !io.sockets.adapter.sids.has(room.id)); // 개인 소켓 제외

  console.log('🔥 Broadcasting room list:', roomData);
  io.emit('room_list', roomData); // ✅ 모든 클라이언트에게 방 리스트 전송
}



io.on('connection', (socket) => {
  const referer = socket.handshake.headers.referer;
  const urlParams = new URLSearchParams(new URL(referer).search);
  const name = urlParams.get('name');
  const userkey = urlParams.get('userkey');
  const nyang = urlParams.get('nyang');

  socket.roomNames = {}; // ✅ 사용자가 입력한 방 번호 저장 객체

  // ✅ 사용자가 접속 시 현재 속한 방 리스트 전송
  updateUserRoomList();

  // const intervalId = setInterval(async () => {
  //   try {
  //     const decoded = decodeURIComponent(userkey);
  //     console.log('decoded: ' + decoded);
  //     const response = await axios.post('https://svr.sotong.com/api/v1/rewards/game', {
  //       userkey: decoded,
  //     });
  //     console.log(`API Response for ${socket.id}:`, response.data);
  //   } catch (error) {
  //     console.error(`API request failed for ${socket.id}:`, error.message);
  //   }
  // }, 60000);

  socket.playerName = name;
  console.log('A user connected: ' + name);

  socket.emit('welcome', {
    id: socket.id,
    username: name
  });

  // ✅ 사용자가 방에 입장할 때 입력한 방 번호 저장 및 리스트 업데이트
  socket.on('room_join', ({ id }) => {
    let room = io.sockets.adapter.rooms.get(id);

    // ✅ 방이 존재하고 인원이 3명이면 입장 불가
    if (room && room.size >= 3) {
      socket.emit('room_join', {
        result: "fail",
        error: "full" // ✅ 풀방 메시지 전송
      });
      console.log(`❌ Room ${id} is full.`);
      return;
    }

    socket.join(id);
    socket.roomNames[id] = id;
    console.log(`✅ User ${socket.id} joined room ${id}`);

    let users = io.sockets.adapter.rooms.get(id) || [];
    io.sockets.in(id).emit('user_info', {
      users: Array.from(users),
      count: users.size,
      id: id,
    });

    socket.emit('room_join', {
      result: "success",
      id: id
    });

    updateUserRoomList(); // ✅ 모든 사용자에게 방 리스트 전송
  });


  // ✅ 사용자가 방에서 나갈 때 해당 방 번호 삭제
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
    updateUserRoomList(); // ✅ 모든 사용자에게 전송
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
      delete socket.roomNames[roomId]; // ✅ 사용자가 떠날 때 모든 방 제거
    });
    console.log(`User ${socket.id} disconnecting.`);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected.`);
    updateUserRoomList(); // ✅ 사용자가 접속 종료 시 리스트 업데이트
  });
});

server.listen(3001, () => {
  console.log('tomato BLACKJACK◇♠♡♣ server listening on *:3001');
});
