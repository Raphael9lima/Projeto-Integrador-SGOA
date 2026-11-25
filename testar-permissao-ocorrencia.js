
const fs = require('fs');

async function testarPermissaoOcorrencia() {
  try {
    console.log('Testando bloqueio de alteração para aluno...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    const respostaLogin = await fetch(
      'http://localhost:3000/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cadastro.email,
          senha: cadastro.senha
        })
      }
    );

    const login = await respostaLogin.json();

    if (!respostaLogin.ok || !login.sessao?.access_token) {
      throw new Error(login.erro || 'Falha no login.');
    }

    const token = login.sessao.access_token;

    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    const resposta = await fetch(
      `http://localhost:3000/ocorrencias/${ocorrenciaId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'RESOLVIDO'
        })
      }
    );

    const resultado = await resposta.json();

    console.log('Status HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (resposta.status === 403) {
      console.log('\nSUCESSO: o aluno foi impedido de alterar a ocorrência!');
      return;
    }

    throw new Error(
      'Resultado inesperado: esperávamos HTTP 403.'
    );

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarPermissaoOcorrencia();
