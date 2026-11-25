
const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/autenticacao');
const supabase = require('../config/supabase');

// CADASTRO
router.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, cgm_ra } = req.body;

    if (!nome || !email || !senha || !cgm_ra) {
      return res.status(400).json({
        erro: 'Preencha nome, email, senha e CGM/RA.'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          cgm_ra
        }
      }
    });

    if (error) {
      return res.status(400).json({
        erro: error.message
      });
    }

    return res.status(201).json({
      mensagem: data.session
        ? 'Cadastro realizado com sucesso!'
        : 'Cadastro realizado! Verifique seu email para confirmar a conta.',
      usuario: data.user
    });

  } catch (error) {
    return res.status(500).json({
      erro: 'Erro interno ao realizar cadastro.'
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: 'Informe email e senha.'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      return res.status(401).json({
        erro: 'Email ou senha inválidos.'
      });
    }

    return res.json({
      mensagem: 'Login realizado com sucesso!',
      usuario: data.user,
      sessao: data.session
    });

  } catch (error) {
    return res.status(500).json({
      erro: 'Erro interno ao realizar login.'
    });
  }
});
// VERIFICAR USUÁRIO AUTENTICADO
router.get('/me', autenticar, (req, res) => {
  return res.json({
    mensagem: 'Usuário autenticado com sucesso!',
    usuario: req.usuario
  });
});
module.exports = router;
