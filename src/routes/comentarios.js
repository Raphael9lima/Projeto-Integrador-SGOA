
const express = require('express');
const router = express.Router();

const autenticar = require('../middleware/autenticacao');

router.use(autenticar);

// GET /comentarios/ocorrencia/:ocorrencia_id
// Consulta comentários de uma ocorrência
router.get('/ocorrencia/:ocorrencia_id', async (req, res) => {
  try {
    const { ocorrencia_id } = req.params;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(ocorrencia_id)) {
      return res.status(400).json({
        erro: 'ID da ocorrência inválido.'
      });
    }

    const { data, error } = await req.supabase
      .from('comentarios')
      .select('*')
      .eq('ocorrencia_id', ocorrencia_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao consultar comentários:', error.message);

      return res.status(500).json({
        erro: 'Não foi possível consultar os comentários.'
      });
    }

    return res.json({
      total: data.length,
      comentarios: data
    });

  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      erro: 'Erro interno ao consultar comentários.'
    });
  }
});


// POST /comentarios/ocorrencia/:ocorrencia_id
// Registra comentário em uma ocorrência
router.post('/ocorrencia/:ocorrencia_id', async (req, res) => {
  try {
    const { ocorrencia_id } = req.params;
    const { texto } = req.body;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(ocorrencia_id)) {
      return res.status(400).json({
        erro: 'ID da ocorrência inválido.'
      });
    }

    if (
      typeof texto !== 'string' ||
      texto.trim().length === 0
    ) {
      return res.status(400).json({
        erro: 'O texto do comentário é obrigatório.'
      });
    }

    if (texto.trim().length > 2000) {
      return res.status(400).json({
        erro: 'O comentário não pode ultrapassar 2000 caracteres.'
      });
    }

    const novoComentario = {
      ocorrencia_id,
      usuario_id: req.usuario.id,
      texto: texto.trim()
    };

    const { data, error } = await req.supabase
      .from('comentarios')
      .insert(novoComentario)
      .select()
      .single();

    if (error) {
      console.error('Erro ao cadastrar comentário:', error.message);

      if (error.code === '42501') {
        return res.status(403).json({
          erro: 'Você não possui permissão para comentar nesta ocorrência.'
        });
      }

      return res.status(400).json({
        erro: 'Não foi possível cadastrar o comentário.'
      });
    }

    return res.status(201).json({
      mensagem: 'Comentário registrado com sucesso!',
      comentario: data
    });

  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      erro: 'Erro interno ao cadastrar comentário.'
    });
  }
});

module.exports = router;
