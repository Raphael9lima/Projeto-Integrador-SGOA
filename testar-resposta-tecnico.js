
const fs = require('fs');

async function testarRespostaTecnico() {
  try {
    console.log('Iniciando teste de resposta do técnico...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro-tecnico.json', 'utf8')
    );

    // 1. Login do técnico
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
      throw new Error(login.erro || 'Falha no login do técnico.');
    }

    console.log('Login do técnico realizado com sucesso!');

    const token = login.sessao.access_token;

    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    // 2. Técnico registra uma resposta
    const resposta = await fetch(
      `http://localhost:3000/comentarios/ocorrencia/${ocorrenciaId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          texto: 'O técnico iniciou a análise do equipamento.'
        })
      }
    );

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha ao registrar resposta.');
    }

    console.log('\nResposta do técnico registrada com sucesso!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarRespostaTecnico();
