
const fs = require('fs');

const URL_API = 'http://localhost:3000';

const OCORRENCIA_ID = '9881a1f7-70da-4e12-aa91-6371d7c42221';

async function executarTeste() {
  try {
    console.log('Iniciando testes de resolução...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro-tecnico.json', 'utf8')
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

    console.log('Login como técnico realizado!\n');

    const token = login.sessao.access_token;

    async function testar(nome, patrimonio) {
      console.log(`--- ${nome} ---`);

      const corpo = {
        status: 'RESOLVIDO'
      };

      if (patrimonio !== undefined) {
        corpo.numero_patrimonio_resolucao = patrimonio;
      }

      const resposta = await fetch(
        `${URL_API}/ocorrencias/${OCORRENCIA_ID}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(corpo)
        }
      );

      const resultado = await resposta.json();

      console.log('Status HTTP:', resposta.status);
      console.log(JSON.stringify(resultado, null, 2));
      console.log('');

      return resposta;
    }

    const teste1 = await testar(
      'Teste 1: sem patrimônio'
    );

    const teste2 = await testar(
      'Teste 2: patrimônio incorreto',
      'PAT-999'
    );

    const teste3 = await testar(
      'Teste 3: patrimônio correto',
      'PAT-001'
    );

    if (
      teste1.status !== 400 ||
      teste2.status !== 400 ||
      !teste3.ok
    ) {
      throw new Error('Um ou mais testes apresentaram resultado inesperado.');
    }

    console.log('TODOS OS TESTES PASSARAM!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

executarTeste();
