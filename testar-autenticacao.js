
const fs = require('fs');

async function testarAutenticacao() {
  try {
    console.log('Iniciando teste de autenticação...\n');

    // Lê os dados da conta de teste
    const cadastro = JSON.parse(
      fs.readFileSync('./cadastro.json', 'utf8')
    );

    // Realiza o login pela API
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
      throw new Error(
        login.erro || 'Não foi possível realizar o login.'
      );
    }

    console.log('Login realizado com sucesso!');

    // Guarda o token somente na memória
    const token = login.sessao.access_token;

    // Testa a rota protegida
    const respostaPerfil = await fetch(
      'http://localhost:3000/auth/me',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const perfil = await respostaPerfil.json();

    if (!respostaPerfil.ok) {
      throw new Error(
        perfil.erro || 'Falha ao verificar autenticação.'
      );
    }

    console.log('\nAutenticação validada!');
    console.log('Dados retornados pela rota /auth/me:');
    console.log(JSON.stringify(perfil, null, 2));

  } catch (erro) {
    console.error('\nERRO NO TESTE:', erro.message);
    process.exitCode = 1;
  }
}

testarAutenticacao();
