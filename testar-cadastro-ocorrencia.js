
const fs = require('fs');

const URL_API = 'http://localhost:3000';
const ARQUIVO_TESTE = './imagem-teste-ocorrencia.png';

async function testarCadastroOcorrencia() {
  try {
    console.log('Iniciando teste de cadastro de ocorrência...\n');

    // 1. Lê os dados da conta de aluno
    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    // 2. Realiza login
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

    console.log('Login realizado com sucesso!');

    const token = login.sessao.access_token;

    // 3. Cria uma imagem PNG de teste
    const imagemBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZ8AAAAASUVORK5CYII=';

    fs.writeFileSync(
      ARQUIVO_TESTE,
      Buffer.from(imagemBase64, 'base64')
    );

    console.log('Imagem de teste criada.');

    // 4. Prepara os dados da ocorrência
    const formulario = new FormData();

    formulario.append('titulo', 'Computador não liga');
    formulario.append(
      'descricao',
      'O computador do laboratório não está iniciando.'
    );
    formulario.append('categoria', 'HARDWARE_QUEBRADO');
formulario.append(
  'equipamento_id',
  '44a47786-0492-40f1-85b8-9019d9125e57'
);
    // A imagem é obrigatória para HARDWARE_QUEBRADO
    const imagem = fs.readFileSync(ARQUIVO_TESTE);

    formulario.append(
      'arquivo',
      new Blob([imagem], { type: 'image/png' }),
      'imagem-teste.png'
    );

    // 5. Envia ocorrência e imagem
    const resposta = await fetch(`${URL_API}/ocorrencias`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formulario
    });

    const resultado = await resposta.json();

    console.log('\nStatus HTTP:', resposta.status);
    console.log('Resposta da API:');
    console.log(JSON.stringify(resultado, null, 2));

    if (!resposta.ok) {
      throw new Error(
        resultado.erro || 'Falha ao cadastrar ocorrência.'
      );
    }

    console.log('\nOcorrência e imagem cadastradas com sucesso!');

  } catch (erro) {
    console.error('\nERRO NO TESTE:', erro.message);
    process.exitCode = 1;

  } finally {
    // Remove a imagem temporária local
    if (fs.existsSync(ARQUIVO_TESTE)) {
      fs.unlinkSync(ARQUIVO_TESTE);
      console.log('\nImagem temporária removida do projeto.');
    }
  }
}

testarCadastroOcorrencia();
