
const fs = require('fs');

async function testarConsultaTecnico() {
  try {
    console.log('Testando consulta de anexos pelo técnico...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro-tecnico.json', 'utf8')
    );

    const respostaLogin = await fetch(
      'http://localhost:3000/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    console.log('Login do técnico realizado com sucesso!');

   const ocorrenciaId = '18dc9ece-ff3f-46be-834d-f35acd944f36';

    const resposta = await fetch(
      `http://localhost:3000/anexos/ocorrencia/${ocorrenciaId}`,
      {
        headers: {
          Authorization: `Bearer ${login.sessao.access_token}`
        }
      }
    );

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha na consulta.');
    }

    console.log('\nTécnico consultou os anexos com sucesso!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarConsultaTecnico();
