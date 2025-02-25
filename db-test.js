require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // .env 파일에서 읽기
});

async function testDB() {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL 연결 성공!");
    const result = await client.query("SELECT NOW()");
    console.log("현재 시간:", result.rows[0]);
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL 연결 실패:", err.message);
  }
}

testDB();
