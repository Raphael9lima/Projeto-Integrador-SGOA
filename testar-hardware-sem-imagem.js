
const fs = require('fs');

const URL_API = 'http://localhost:3000';

async function testarHardwareSemImagem() {
  try {
    console.log('Testando HARDWARE_QUEBRADO sem imagem...\n');

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

    // 3. Prepara a ocorrência SEM anexar imagem
    const formulario = new FormData();

    formulario.append(
      'titulo',
      'Teste de hardware sem imagem'
    );

    formulario.append(
      'descricao',
      'Teste para verificar se a API bloqueia ocorrências de hardware sem imagem.'
    );

    formulario.append(
      'categoria',
      'HARDWARE_QUEBRADO'
    );

    formulario.append(
      'equipamento_id',
      '44a47786-0492-40f1-85b8-9019d9125e57'
    );

    // 4. Envia somente os dados, sem arquivo
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

    // 5. Valida o resultado esperado
    if (resposta.status === 400) {
      console.log(
        '\nTESTE APROVADO: a API bloqueou a ocorrência sem imagem.'
      );
      return;
    }

    if (resposta.ok) {
      throw new Error(
        'FALHA DE SEGURANÇA: a API aceitou uma ocorrência HARDWARE_QUEBRADO sem imagem.'
      );
    }

    throw new Error(
      `Resposta inesperada: HTTP ${resposta.status}. Verifique a validação da API.`
    );

  } catch (erro) {
    console.error('\nERRO NO TESTE:', erro.message);
    process.exitCode = 1;
  }
}

testarHardwareSemImagem();
