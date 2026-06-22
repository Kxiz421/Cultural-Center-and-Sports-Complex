const bcrypt = require('bcryptjs');

async function main() {
  const salt = bcrypt.genSaltSync(12);
  const passwords = ['admin123', 'clerk123', 'pass321', 'pass654', 'pass987', 'pass159', 'pass753'];
  
  for (const pw of passwords) {
    console.log(`${pw}: ${bcrypt.hashSync(pw, salt)}`);
  }
}

main();