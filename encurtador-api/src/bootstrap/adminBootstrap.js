const bcrypt = require('bcrypt');
const User = require('../models/User');

const resolveAdminPasswordHash = async () => {
  const adminPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (adminPasswordHash) {
    return adminPasswordHash;
  }

  const adminPassword = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!adminPassword) {
    return '';
  }

  console.warn('ADMIN_PASSWORD está em texto puro. Prefira ADMIN_PASSWORD_HASH.');
  return bcrypt.hash(adminPassword, 10);
};

const bootstrapAdminUser = async () => {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const senhaHash = await resolveAdminPasswordHash();

  if (!adminEmail || !senhaHash) {
    console.warn('Bootstrap de admin ignorado: defina ADMIN_EMAIL e ADMIN_PASSWORD_HASH.');
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    let changed = false;

    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      changed = true;
      console.log(`Usuário ${adminEmail} promovido para admin.`);
    }

    if (existingAdmin.ativo === false) {
      existingAdmin.ativo = true;
      changed = true;
      console.log(`Usuário ${adminEmail} foi reativado para acesso administrativo.`);
    }

    if (changed) {
      await existingAdmin.save();
    }

    return;
  }

  await User.create({
    nome: 'Administrador',
    email: adminEmail,
    senhaHash,
    role: 'admin',
    ativo: true
  });

  console.log(`Admin inicial criado para ${adminEmail}.`);
};

module.exports = { bootstrapAdminUser };