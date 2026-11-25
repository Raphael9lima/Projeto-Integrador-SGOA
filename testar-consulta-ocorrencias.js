
const fs = require('fs');

async function testarConsultaOcorrencias() {
  try {
    console.log('Iniciando teste de consulta...\n');

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

    const resposta = await fetch(
      'http://localhost:3000/ocorrencias',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const resultado = await resposta.json();

    console.log('Status HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha na consulta.');
    }

    console.log('\nConsulta realizada com sucesso!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarConsultaOcorrencias();
