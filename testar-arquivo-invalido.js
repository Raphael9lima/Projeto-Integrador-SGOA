
const fs = require('fs');

async function testarArquivoInvalido() {
  const arquivoTeste = './arquivo-invalido.txt';

  try {
    console.log('Iniciando teste de arquivo inválido...\n');

    // Lê os dados do aluno
    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    // 1. Login
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

    // 2. Criar arquivo de texto disfarçado de PNG
    fs.writeFileSync(
      arquivoTeste,
      'Este conteúdo não é uma imagem PNG.'
    );

    const token = login.sessao.access_token;
    const ocorrenciaId = 'a2dedb6d-6619-4090-850a-90a781557eda';

    const conteudo = fs.readFileSync(arquivoTeste);

    const formulario = new FormData();

    formulario.append(
      'arquivo',
      new Blob([conteudo], { type: 'image/png' }),
      'arquivo-falso.png'
    );

    // 3. Enviar arquivo inválido
    const resposta = await fetch(
      `http://localhost:3000/anexos/ocorrencia/${ocorrenciaId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formulario
      }
    );

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log(JSON.stringify(resultado, null, 2));

    if (
      resposta.status === 400 &&
      resultado.erro === 'O conteúdo do arquivo não corresponde ao formato informado.'
    ) {
      console.log('\nSUCESSO: arquivo inválido rejeitado corretamente!');
    } else {
      throw new Error(
        'O resultado não corresponde à rejeição esperada.'
      );
    }

  } catch (erro) {
    console.error('\nERRO:', erro.message);
    process.exitCode = 1;

  } finally {
    if (fs.existsSync(arquivoTeste)) {
      fs.unlinkSync(arquivoTeste);
      console.log('\nArquivo temporário removido do projeto.');
    }
  }
}

testarArquivoInvalido();
