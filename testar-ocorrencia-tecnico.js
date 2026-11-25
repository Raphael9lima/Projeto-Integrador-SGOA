
const fs = require('fs');

const URL_API = 'http://localhost:3000';

async function executarTeste() {
  try {
    console.log('Criando ocorrência de teste como técnico...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro-tecnico.json', 'utf8')
    );

    const respostaLogin = await fetch(`${URL_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cadastro.email,
        senha: cadastro.senha
      })
    });

    const login = await respostaLogin.json();

    if (!respostaLogin.ok || !login.sessao?.access_token) {
      throw new Error(login.erro || 'Falha no login.');
    }

    const token = login.sessao.access_token;

    console.log('Login do técnico realizado!');

    const resposta = await fetch(`${URL_API}/ocorrencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        titulo: 'Ocorrência de teste de permissões',
        descricao: 'Registro para verificar o isolamento entre usuários.',
        categoria: 'OUTROS'
      })
    });

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha ao criar ocorrência.');
    }

    console.log('\nOcorrência criada com sucesso!');
    console.log('ID para o próximo teste:', resultado.ocorrencia.id);

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

executarTeste();
