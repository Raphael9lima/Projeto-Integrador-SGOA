
const express = require('express');
const router = express.Router();

const autenticar = require('../middleware/autenticacao');
const autorizarPerfil = require('../middleware/autorizarPerfil');

// Todas as rotas exigem autenticação
router.use(autenticar);

// LISTAR EQUIPAMENTOS
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('equipamentos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar equipamentos:', error.message);

      return res.status(500).json({
        erro: 'Não foi possível consultar os equipamentos.'
      });
    }

    return res.json({
      total: data.length,
      equipamentos: data
    });

  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      erro: 'Erro interno ao consultar equipamentos.'
    });
  }
});

// CADASTRAR EQUIPAMENTO
router.post(
  '/',
  autorizarPerfil('TECNICO', 'ADMIN'),
  async (req, res) => {
    try {
      const { numero_patrimonio, nome, ambiente } = req.body;

      if (
        typeof numero_patrimonio !== 'string' ||
        !numero_patrimonio.trim() ||
        typeof nome !== 'string' ||
        !nome.trim() ||
        typeof ambiente !== 'string' ||
        !ambiente.trim()
      ) {
        return res.status(400).json({
          erro: 'Informe número de patrimônio, nome e ambiente.'
        });
      }

      const { data, error } = await req.supabase
        .from('equipamentos')
        .insert({
          numero_patrimonio: numero_patrimonio.trim(),
          nome: nome.trim(),
          ambiente: ambiente.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao cadastrar equipamento:', error.message);

        return res.status(400).json({
          erro: 'Não foi possível cadastrar o equipamento.'
        });
      }

      return res.status(201).json({
        mensagem: 'Equipamento cadastrado com sucesso!',
        equipamento: data
      });

    } catch (error) {
      console.error('Erro inesperado:', error.message);

      return res.status(500).json({
        erro: 'Erro interno ao cadastrar equipamento.'
      });
    }
  }
);

// ATUALIZAR EQUIPAMENTO
router.patch(
  '/:id',
  autorizarPerfil('TECNICO', 'ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const camposPermitidos = [
        'numero_patrimonio',
        'nome',
        'ambiente'
      ];

      const atualizacoes = {};

      for (const campo of camposPermitidos) {
        if (req.body[campo] !== undefined) {
          if (
            typeof req.body[campo] !== 'string' ||
            !req.body[campo].trim()
          ) {
            return res.status(400).json({
              erro: `O campo ${campo} deve ser um texto válido.`
            });
          }

          atualizacoes[campo] = req.body[campo].trim();
        }
      }

      if (Object.keys(atualizacoes).length === 0) {
        return res.status(400).json({
          erro: 'Informe pelo menos um campo para atualizar.'
        });
      }

      const { data, error } = await req.supabase
        .from('equipamentos')
        .update(atualizacoes)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          erro: 'Equipamento não encontrado ou não foi possível atualizar.'
        });
      }

      return res.json({
        mensagem: 'Equipamento atualizado com sucesso!',
        equipamento: data
      });

    } catch (error) {
      console.error('Erro ao atualizar equipamento:', error.message);

      return res.status(500).json({
        erro: 'Erro interno ao atualizar equipamento.'
      });
    }
  }
);

// EXCLUIR EQUIPAMENTO
router.delete(
  '/:id',
  autorizarPerfil('TECNICO', 'ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await req.supabase
        .from('equipamentos')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error || !data) {
        return res.status(404).json({
          erro: 'Equipamento não encontrado ou não foi possível excluir.'
        });
      }

      return res.json({
        mensagem: 'Equipamento excluído com sucesso!',
        id: data.id
      });

    } catch (error) {
      console.error('Erro ao excluir equipamento:', error.message);

      return res.status(500).json({
        erro: 'Erro interno ao excluir equipamento.'
      });
    }
  }
);

module.exports = router;
