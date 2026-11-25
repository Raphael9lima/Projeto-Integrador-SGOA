
const fs = require('fs');

const URL_API = 'http://localhost:3000';

const OCORRENCIA_TECNICO =
  '18dc9ece-ff3f-46be-834d-f35acd944f36';

async function executarTeste() {
  try {
    console.log('Testando isolamento de anexos...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    const respostaLogin = await fetch(`${URL_API}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: cadastro.email,
        senha: cadastro.senha
      })
    });

    const login = await respostaLogin.json();

    if (!respostaLogin.ok || !login.sessao?.access_token) {
      throw new Error(login.erro || 'Falha no login.');
    }

    console.log('Login como aluno realizado!\n');

    const token = login.sessao.access_token;

    const resposta = await fetch(
      `${URL_API}/anexos/ocorrencia/${OCORRENCIA_TECNICO}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const resultado = await resposta.json();

    console.log('Status HTTP:', resposta.status);
    console.log('Resposta:');
    console.log(JSON.stringify(resultado, null, 2));

    if (resposta.status === 403 || resposta.status === 404) {
      console.log('\nTESTE APROVADO!');
      console.log('O aluno não conseguiu acessar os anexos da ocorrência do técnico.');
      return;
    }

    if (resposta.ok && resultado.total === 0) {
      throw new Error(
        'A API retornou uma lista vazia. Precisamos verificar se a rota realmente bloqueou o acesso.'
      );
    }

    throw new Error(
      'O resultado não corresponde ao bloqueio de acesso esperado.'
    );

  } catch (erro) {
    console.error('\nERRO NO TESTE:', erro.message);
    process.exitCode = 1;
  }
}

executarTeste();
