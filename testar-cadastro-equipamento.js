
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function testarCadastro() {
  try {
    const arquivo = path.join(__dirname, 'cadastro-tecnico.json');

    if (!fs.existsSync(arquivo)) {
      throw new Error('Arquivo cadastro-tecnico.json não encontrado.');
    }

    const cadastro = JSON.parse(
      fs.readFileSync(arquivo, 'utf8')
    );

    if (!cadastro.email || !cadastro.senha) {
      throw new Error('Email ou senha não informados.');
    }

    console.log('Realizando login como técnico...');

    const login = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cadastro.email,
        senha: cadastro.senha
      })
    });

    const dadosLogin = await login.json();

    if (!login.ok || !dadosLogin.sessao?.access_token) {
      throw new Error('Falha no login: ' + JSON.stringify(dadosLogin));
    }

    console.log('Login realizado com sucesso!');

    const resposta = await fetch('http://localhost:3000/equipamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dadosLogin.sessao.access_token}`
      },
      body: JSON.stringify({
        numero_patrimonio: 'PAT-001',
        nome: 'Computador de teste',
        ambiente: 'Laboratório de informática'
      })
    });

    const resultado = await resposta.json();

    console.log('Status:', resposta.status);
    console.log('Resposta:', resultado);

  } catch (erro) {
    console.error('Erro no teste:', erro.message);
  }
}

testarCadastro();
