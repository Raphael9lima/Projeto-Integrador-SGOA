
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function testarAtualizacao() {
  try {
    const arquivo = path.join(__dirname, 'cadastro-tecnico.json');
    const cadastro = JSON.parse(fs.readFileSync(arquivo, 'utf8'));

    if (!cadastro.email || !cadastro.senha) {
      throw new Error('Credenciais não encontradas.');
    }

    console.log('Autenticando técnico...');

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

    const token = dadosLogin.sessao.access_token;

    console.log('Login realizado com sucesso!');
    console.log('Atualizando equipamento...');

    const id = '49552d9e-0252-4c9b-b4bd-8ac5c04f8c5f';

    const resposta = await fetch(
      `http://localhost:3000/equipamentos/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: 'Computador atualizado',
          ambiente: 'Laboratório de informática 2'
        })
      }
    );

    const resultado = await resposta.json();

    console.log('Status:', resposta.status);
    console.log('Resposta:', resultado);

  } catch (erro) {
    console.error('Erro no teste:', erro.message);
  }
}

testarAtualizacao();
