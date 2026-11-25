
const fs = require('fs');

async function testarConsultaComentarios() {
  try {
    console.log('Iniciando teste de consulta de comentários...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    // 1. Realizar login do aluno
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

    console.log('Login realizado com sucesso!');

    const token = login.sessao.access_token;

    // 2. ID da ocorrência criada anteriormente
    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    // 3. Consultar comentários
    const resposta = await fetch(
      `http://localhost:3000/comentarios/ocorrencia/${ocorrenciaId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha ao consultar comentários.');
    }

    console.log('\nConsulta de comentários realizada com sucesso!');
    console.log('Total de comentários:', resultado.total);

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarConsultaComentarios();
