const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});;
const Game = require('./game');
const { MIMEType } = require('util');
const path = require('path');
const fs = require('fs');
const axios = require('axios'); // axios 추가

app.use('/assets', express.static(__dirname + '/assets'));

let game = new Map();

app.get('/', (req, res) => {
  const { name, nyang } = req.query; // 쿼리 파라미터 추출  

  console.log(`Player Name: ${name}, Bet: ${nyang}`);

  // index.html 파일 경로
  const filePath = path.join(__dirname, 'index.html');

  // HTML 파일 읽기
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      console.error("Error reading HTML file:", err);
      res.status(500).send("Error loading page");
      return;
    }

    // HTML 파일에 데이터를 삽입
    const updatedHtml = html.replace(
      '<script id="server-data"></script>',
      `<script id="server-data">        
        const playerName = "${name}";
        const nyang = ${nyang};        
      </script>`
    );

    // 수정된 HTML 전송
    res.send(updatedHtml);
  });
});

io.on('connection', (socket) => {
  const referer = socket.handshake.headers.referer;
  const urlParams = new URLSearchParams(new URL(referer).search);
  const name = urlParams.get('name');
  const userkey = urlParams.get('userkey');
  const nyang = urlParams.get('nyang');

  // 1분마다 API 요청 보내기
  const intervalId = setInterval(async () => {
    try {
      // const response = await axios.post('https://svr.sotong.com/api/v1/rewards/game', {
      const response = await axios.post('http://localhost:8080/api/v1/rewards/game', {
      });
      console.log(`API Response for ${socket.id}:`, response.data);
      // 소켓에 API 응답 보내기 (옵션)
      // socket.emit('api_data', response.data);
    } catch (error) {
      console.error(`API request failed for ${socket.id}:`, error.message);
    }
  }, 60000); // 60,000ms = 1분



  // 사용자 이름을 socket 객체에 저장
  socket.playerName = name;

  console.log('a user connected ' + name);

  socket.emit('welcome', {
    id: socket.id,
    username: name
    // id : name
  });

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
    console.log("***id: " + id);
    let users = io.sockets.adapter.rooms.get(id);

    console.log("***users: " + users[0]);
    if (users == null) {
      users = [];
    }
    io.sockets.in(id).emit('user_info', {
      users: Array.from(users),
      result: "success"
    });

    console.log(`${socket.id} is joined ROOM ID<${id}>.`);
    socket.emit('room_join', {
      result: "success"
    });
  });

  socket.on('room_leave', ({ id }) => {
    socket.leave(id);
    let users = io.sockets.adapter.rooms.get(id);
    console.log(users);
    if (users == null) {
      users = [];
    }
    socket.emit('user_info', {
      users: Array.from(users),
      result: "success"
    });
    io.sockets.in(id).emit('user_info', {
      users: Array.from(users),
      result: "success"
    });
    socket.emit("room_leave", {
      result: "success"
    });
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

  // Listen for the 'gameResult' event
  socket.on('gameResult', async ({ winners, losers }) => {
    try {
      // console.log('Received gameResult:', { winners, losers });

      // // Determine the payload based on whether it's a win or a loss
      // let payload = {};
      // if (winners) {
      //   payload = { winners };
      //   console.log('Winner data:', winners);
      // } else if (losers) {
      //   payload = { losers };
      //   console.log('Loser data:', losers);
      // } else {
      //   throw new Error('No winners or losers data provided');
      // }

      // Make a POST request to the API
      const response = await axios.post('http://1.201.162.165/game/result', payload);

      console.log('API response:', response.data);

      // Send a success response back to the client
      // socket.emit('gameResultResponse', { success: true, data: response.data });
    } catch (error) {
      console.error('Error calling the API:', error.message);

      // Send an error response back to the client
      // socket.emit('gameResultResponse', { success: false, error: error.message });
    }
  });

  socket.on('disconnecting', () => {
    clearInterval(intervalId);
    if (socket.rooms.size < 2) {
      return;
    }
    let roomId = Array.from(socket.rooms)[1];
    let users = io.sockets.adapter.rooms.get(roomId);
    users.delete(socket.id);
    io.sockets.in(roomId).emit('user_info', {
      users: Array.from(users),
      result: "success"
    });
  });

  socket.on('disconnect', () => {
    console.log("a user disconnected, " + socket.id);
  });
});

server.listen(3001, () => {
  console.log('tomato BLACKJACK◇♠♡♣ server listening on *:3001');

});