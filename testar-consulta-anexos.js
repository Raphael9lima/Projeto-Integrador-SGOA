
const fs = require('fs');

async function testarConsultaAnexos() {
  try {
    console.log('Iniciando teste de consulta de anexos...\n');

    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    // 1. Login do aluno
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

    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    // 2. Consultar anexos
    const resposta = await fetch(
      `http://localhost:3000/anexos/ocorrencia/${ocorrenciaId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);

    if (!resposta.ok) {
      console.log(JSON.stringify(resultado, null, 2));
      throw new Error(resultado.erro || 'Falha na consulta.');
    }

    console.log('\nTotal de anexos:', resultado.total);

    for (const anexo of resultado.anexos) {
      console.log('\nArquivo:', anexo.nome_arquivo);
      console.log('Tipo:', anexo.tipo_mime);
      console.log('Tamanho:', anexo.tamanho_bytes, 'bytes');
      console.log(
        'Link temporário gerado:',
        Boolean(anexo.url_temporaria)
      );
    }

    console.log('\nConsulta de anexos realizada com sucesso!');

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;
  }
}

testarConsultaAnexos();
