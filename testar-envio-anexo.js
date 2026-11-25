
const fs = require('fs');

async function testarEnvioAnexo() {
  const arquivoTeste = './anexo-teste.png';

  try {
    console.log('Iniciando teste de envio de anexo...\n');

    // Cria uma pequena imagem PNG válida para o teste
    const imagemBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZ8AAAAASUVORK5CYII=';

    fs.writeFileSync(
      arquivoTeste,
      Buffer.from(imagemBase64, 'base64')
    );

    // Lê os dados do aluno
    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro-tecnico.json', 'utf8')
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

    // 2. Preparar o arquivo
    const token = login.sessao.access_token;
    const ocorrenciaId = '18dc9ece-ff3f-46be-834d-f35acd944f36';

    const imagem = fs.readFileSync(arquivoTeste);

    const formulario = new FormData();

    formulario.append(
      'arquivo',
      new Blob([imagem], { type: 'image/png' }),
      'anexo-teste.png'
    );

    // 3. Enviar anexo
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

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Falha no envio do anexo.');
    }

    console.log('\nAnexo enviado e registrado com sucesso!');

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

testarEnvioAnexo();
