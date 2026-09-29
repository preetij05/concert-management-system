const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Preeti05@',
  database: 'ConcertManagement'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL connected.......');
});

module.exports = db;
