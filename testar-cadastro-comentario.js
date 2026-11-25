
const fs = require('fs');

async function testarCadastroComentario() {
  try {
    console.log('Iniciando teste de cadastro de comentário...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    // Login do aluno
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

    console.log('Login do aluno realizado com sucesso!');

    const token = login.sessao.access_token;

    // ID da ocorrência criada anteriormente
    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    // Cadastro do comentário
    const resposta = await fetch(
      `http://localhost:3000/comentarios/ocorrencia/${ocorrenciaId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          texto: 'Gostaria de saber se há previsão para a conclusão do reparo.'
        })
      }
    );

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha ao cadastrar comentário.');
    }

    console.log('\nComentário cadastrado com sucesso!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarCadastroComentario();
