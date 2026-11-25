
const fs = require('fs');

async function testarAtualizacaoOcorrencia() {
  try {
    console.log('Iniciando teste de atualização...\n');

    // Lê os dados da conta de técnico
    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro-tecnico.json', 'utf8')
    );

    // Login
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

    // ID da ocorrência cadastrada anteriormente
    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    // Atualiza o status
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

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha ao atualizar ocorrência.');
    }

    console.log('\nOcorrência atualizada com sucesso!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarAtualizacaoOcorrencia();
