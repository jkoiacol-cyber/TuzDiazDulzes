const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Ingresa la contraseña de administrador: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('❌ La contraseña debe tener al menos 8 caracteres');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n✅ Hash generado exitosamente!\n');
  console.log('📋 Copia este hash y agrégalo a Netlify:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
  console.log('Comandos para agregar a Netlify:\n');
  console.log(`npx netlify env:set ADMIN_PASSWORD_HASH "${hash}"\n`);
  
  rl.close();
});