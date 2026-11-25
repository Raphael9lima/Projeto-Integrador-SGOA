
require('dotenv').config();

const fs = require('fs');
const path = require('path');

async function testarExclusao() {
  try {
    const arquivo = path.join(__dirname, 'cadastro-tecnico.json');

    if (!fs.existsSync(arquivo)) {
      throw new Error('Arquivo de credenciais não encontrado.');
    }

    const cadastro = JSON.parse(fs.readFileSync(arquivo, 'utf8'));

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

    console.log('Login realizado com sucesso!');

    const id = '49552d9e-0252-4c9b-b4bd-8ac5c04f8c5f';

    console.log('Excluindo equipamento...');

    const resposta = await fetch(
      `http://localhost:3000/equipamentos/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${dadosLogin.sessao.access_token}`
        }
      }
    );

    const resultado = await resposta.json();

    console.log('Status:', resposta.status);
    console.log('Resposta:', resultado);

  } catch (erro) {
    console.error('Erro no teste:', erro.message);
  }
}

testarExclusao();
