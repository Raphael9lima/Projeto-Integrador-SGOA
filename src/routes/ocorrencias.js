
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const router = express.Router();

const autenticar = require('../middleware/autenticacao');
const autorizarPerfil = require('../middleware/autorizarPerfil');

const BUCKET = 'anexos-ocorrencias';
const LIMITE_ARQUIVO = 5 * 1024 * 1024;

const categorias = [
  'HARDWARE_QUEBRADO',
  'SEM_INTERNET',
  'SOFTWARE',
  'MOBILIARIO',
  'OUTROS'
];

const prioridades = [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'URGENTE'
];

const statusPermitidos = [
  'ABERTO',
  'EM_ANDAMENTO',
  'RESOLVIDO',
  'CANCELADO'
];

const TIPOS_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ========================================
// VALIDAÇÃO DA ASSINATURA DO ARQUIVO
// ========================================

function validarAssinaturaArquivo(buffer, tipo) {
  if (!Buffer.isBuffer(buffer)) return false;

  if (tipo === 'image/png') {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      );
  }

  if (tipo === 'image/jpeg') {
    return buffer.length >= 3 &&
      buffer[0] === 0xFF &&
      buffer[1] === 0xD8 &&
      buffer[2] === 0xFF;
  }

  if (tipo === 'image/webp') {
    return buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  if (tipo === 'application/pdf') {
    return buffer.length >= 5 &&
      buffer.toString('ascii', 0, 5) === '%PDF-';
  }

  return false;
}

// ========================================
// CONFIGURAÇÃO DO MULTER
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: LIMITE_ARQUIVO,
    files: 1
  },

  fileFilter: (req, file, callback) => {
    if (!TIPOS_PERMITIDOS[file.mimetype]) {
      return callback(
        new Error('Formato não permitido. Envie JPG, PNG, WEBP ou PDF.')
      );
    }

    callback(null, true);
  }
});

// JSON continua funcionando normalmente.
// Multer é executado somente em requisições multipart/form-data.
function receberArquivo(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  upload.single('arquivo')(req, res, (erro) => {
    if (!erro) return next();

    console.error('Erro ao receber arquivo:', erro.message);

    if (erro instanceof multer.MulterError) {
      return res.status(400).json({
        erro: erro.code === 'LIMIT_FILE_SIZE'
          ? 'O arquivo ultrapassa o limite de 5 MB.'
          : 'Não foi possível receber o arquivo.'
      });
    }

    return res.status(400).json({
      erro: erro.message
    });
  });
}

// ========================================
// LIMPEZA DE ARQUIVO NO STORAGE
// ========================================

async function removerArquivoStorage(supabase, caminho) {
  if (!caminho) return true;

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([caminho]);

    if (error) {
      console.error(
        'ATENÇÃO: não foi possível remover o arquivo do Storage:',
        error.message
      );

      return false;
    }

    console.log('Arquivo removido do Storage:', caminho);
    return true;

  } catch (error) {
    console.error(
      'ERRO inesperado ao remover arquivo do Storage:',
      error.message
    );

    return false;
  }
}

// ========================================
async function removerOcorrenciaCompensacao(supabase, ocorrenciaId) {
  if (!ocorrenciaId) return false;

  try {
    const { error } = await supabase
      .from('ocorrencias')
      .delete()
      .eq('id', ocorrenciaId);

    if (error) {
      console.error('Erro ao remover ocorrencia na compensacao:', error.message);
      return false;
    }

    console.log('Compensacao concluida. Ocorrencia removida:', ocorrenciaId);
    return true;
  } catch (error) {
    console.error('Erro inesperado na compensacao:', error.message);
    return false;
  }
}

// TODAS AS ROTAS EXIGEM AUTENTICAÇÃO
// ========================================

router.use(autenticar);

// ========================================
// LISTAR OCORRÊNCIAS
// ========================================

router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('ocorrencias')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar ocorrências:', error.message);

      return res.status(500).json({
        erro: 'Não foi possível consultar as ocorrências.'
      });
    }

    return res.json({
      total: data.length,
      ocorrencias: data
    });

  } catch (error) {
    console.error('Erro inesperado ao listar ocorrências:', error.message);

    return res.status(500).json({
      erro: 'Erro interno ao consultar ocorrências.'
    });
  }
});

// ========================================
// CONSULTAR UMA OCORRÊNCIA
// ========================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        erro: 'ID da ocorrência inválido.'
      });
    }

    const { data, error } = await req.supabase
      .from('ocorrencias')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        erro: 'Ocorrência não encontrada ou sem acesso.'
      });
    }

    return res.json({
      ocorrencia: data
    });

  } catch (error) {
    console.error('Erro ao consultar ocorrência:', error.message);

    return res.status(500).json({
      erro: 'Erro interno ao consultar ocorrência.'
    });
  }
});

// ========================================
// CADASTRAR OCORRÊNCIA COM ANEXO OPCIONAL
// ========================================

router.post(
  '/',
  autorizarPerfil('ALUNO', 'PROFESSOR', 'TECNICO', 'ADMIN'),
  receberArquivo,
  async (req, res) => {
    let caminhoArquivo = null;
    let ocorrenciaId = null;

    try {
      const {
        titulo,
        descricao,
        categoria,
        equipamento_id
      } = req.body;

      const arquivo = req.file;

      // Validação dos campos
      if (
        typeof titulo !== 'string' ||
        !titulo.trim() ||
        typeof descricao !== 'string' ||
        !descricao.trim() ||
        !categorias.includes(categoria)
      ) {
        return res.status(400).json({
          erro: 'Informe título, descrição e categoria válidos.'
        });
      }

      // HARDWARE_QUEBRADO exige imagem
      if (categoria === 'HARDWARE_QUEBRADO' && !arquivo) {
        return res.status(400).json({
          erro: 'É obrigatório enviar uma imagem para ocorrências de hardware quebrado.'
        });
      }

      // Para hardware quebrado, PDF não é aceito como substituto da imagem
      if (
        categoria === 'HARDWARE_QUEBRADO' &&
        arquivo &&
        !['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.mimetype)
      ) {
        return res.status(400).json({
          erro: 'Para hardware quebrado, envie uma imagem JPG, PNG ou WEBP.'
        });
      }

      // Valida o conteúdo real do arquivo
      if (arquivo && !validarAssinaturaArquivo(
        arquivo.buffer,
        arquivo.mimetype
      )) {
        return res.status(400).json({
          erro: 'O conteúdo do arquivo não corresponde ao formato informado.'
        });
      }

      // Valida equipamento, quando informado
      if (equipamento_id !== undefined && equipamento_id !== null) {
        if (
          typeof equipamento_id !== 'string' ||
          !UUID_REGEX.test(equipamento_id)
        ) {
          return res.status(400).json({
            erro: 'Identificador do equipamento inválido.'
          });
        }

        const { data: equipamento, error: erroEquipamento } =
          await req.supabase
            .from('equipamentos')
            .select('id')
            .eq('id', equipamento_id)
            .maybeSingle();

        if (erroEquipamento) {
          console.error(
            'Erro ao verificar equipamento:',
            erroEquipamento.message
          );

          return res.status(500).json({
            erro: 'Não foi possível verificar o equipamento.'
          });
        }

        if (!equipamento) {
          return res.status(400).json({
            erro: 'Equipamento não encontrado ou sem acesso.'
          });
        }
      }

      // Prioridade automática conforme perfil
      let prioridadeAutomatica;

      if (req.usuario.perfil === 'PROFESSOR') {
        prioridadeAutomatica = 'ALTA';
      } else {
        prioridadeAutomatica = 'MEDIA';
      }

      const novaOcorrencia = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria,
        prioridade: prioridadeAutomatica,
        usuario_id: req.usuario.id
      };

      if (equipamento_id) {
        novaOcorrencia.equipamento_id = equipamento_id;
      }

      // 1. Cria a ocorrência
      const { data: ocorrencia, error: erroOcorrencia } =
        await req.supabase
          .from('ocorrencias')
          .insert(novaOcorrencia)
          .select()
          .single();

      if (erroOcorrencia || !ocorrencia) {
        console.error(
          'Erro ao cadastrar ocorrência:',
          erroOcorrencia?.message
        );

        return res.status(400).json({
          erro: 'Não foi possível cadastrar a ocorrência.'
        });
      }

      // 2. Se não houver arquivo, finaliza o cadastro
      ocorrenciaId = ocorrencia.id;

      if (!arquivo) {
        return res.status(201).json({
          mensagem: 'Ocorrência registrada com sucesso!',
          ocorrencia,
          anexo: null
        });
      }

      // 3. Prepara o caminho no Storage
      const extensao = TIPOS_PERMITIDOS[arquivo.mimetype];
      const nomeInterno = `${crypto.randomUUID()}${extensao}`;

      caminhoArquivo = `${ocorrencia.id}/${nomeInterno}`;

      // 4. Envia o arquivo ao Storage
      const { error: erroUpload } = await req.supabase.storage
        .from(BUCKET)
        .upload(caminhoArquivo, arquivo.buffer, {
          contentType: arquivo.mimetype,
          upsert: false
        });

      
if (erroUpload) {
  console.error('Erro no upload do Storage:', erroUpload.message);

  const arquivoRemovido = await removerArquivoStorage(
    req.supabase,
    caminhoArquivo
  );

  if (!arquivoRemovido) {
    return res.status(500).json({
      erro: 'O upload falhou e não foi possível confirmar a limpeza do arquivo. A ocorrência foi mantida para permitir uma nova tentativa de limpeza.',
      ocorrencia_id: ocorrencia.id
    });
  }

  caminhoArquivo = null;

  const ocorrenciaRemovida = await removerOcorrenciaCompensacao(
    req.supabase,
    ocorrencia.id
  );

  if (!ocorrenciaRemovida) {
    return res.status(500).json({
      erro: 'O upload falhou e a ocorrência não pôde ser removida automaticamente.',
      ocorrencia_id: ocorrencia.id
    });
  }

  return res.status(500).json({
    erro: 'Não foi possível armazenar o anexo. A ocorrência criada foi removida.',
  });
}


      // 5. Registra os dados do anexo no banco
      const { data: anexo, error: erroAnexo } = await req.supabase
        .from('anexos')
        .insert({
          ocorrencia_id: ocorrencia.id,
          usuario_id: req.usuario.id,
          nome_arquivo: path.basename(arquivo.originalname),
          caminho_arquivo: caminhoArquivo,
          tipo_mime: arquivo.mimetype,
          tamanho_bytes: arquivo.size
        })
        .select()
        .single();

     
if (erroAnexo || !anexo) {
  console.error(
    'Erro ao registrar anexo:',
    erroAnexo?.message
  );

  const arquivoRemovido = await removerArquivoStorage(
    req.supabase,
    caminhoArquivo
  );

  if (!arquivoRemovido) {
    return res.status(500).json({
      erro: 'Não foi possível registrar o anexo nem remover o arquivo do Storage. A ocorrência foi mantida para permitir uma nova tentativa de limpeza.',
      ocorrencia_id: ocorrencia.id
    });
  }

  caminhoArquivo = null;

  const ocorrenciaRemovida = await removerOcorrenciaCompensacao(
    req.supabase,
    ocorrencia.id
  );

  if (!ocorrenciaRemovida) {
    return res.status(500).json({
      erro: 'O anexo não pôde ser registrado e a ocorrência não foi removida automaticamente.',
      ocorrencia_id: ocorrencia.id
    });
  }

  return res.status(500).json({
    erro: 'Não foi possível registrar o anexo. O arquivo e a ocorrência foram removidos.',
  });
}


      caminhoArquivo = null;

      return res.status(201).json({
        mensagem: 'Ocorrência e anexo registrados com sucesso!',
        ocorrencia,
        anexo
      });

        } catch (error) {
      console.error(
        'Erro ao cadastrar ocorrência:',
        error.message
      );

      let arquivoRemovido = true;

      if (caminhoArquivo) {
        arquivoRemovido = await removerArquivoStorage(
          req.supabase,
          caminhoArquivo
        );
      }

      if (arquivoRemovido && ocorrenciaId) {
        const ocorrenciaRemovida = await removerOcorrenciaCompensacao(
          req.supabase,
          ocorrenciaId
        );

        if (!ocorrenciaRemovida) {
          console.error(
            'Atenção: ocorrência permaneceu no banco:',
            ocorrenciaId
          );
        }
      }

      return res.status(500).json({
        erro: 'Erro interno ao cadastrar ocorrência. Verifique os registros de limpeza no servidor.',
        ocorrencia_id: ocorrenciaId
      });
    }
  }
);
// ========================================
// ATUALIZAR STATUS E PRIORIDADE
// ========================================


async function atualizarOcorrencia(req, res) {
  try {
    const { id } = req.params;
    const { status, prioridade, numero_patrimonio_resolucao } = req.body;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        erro: 'ID da ocorrência inválido.'
      });
    }

    const atualizacoes = {};

    if (status !== undefined) {
      if (!statusPermitidos.includes(status)) {
        return res.status(400).json({
          erro: 'Status inválido.'
        });
      }

      if (status === 'RESOLVIDO') {
        if (
          typeof numero_patrimonio_resolucao !== 'string' ||
          !numero_patrimonio_resolucao.trim()
        ) {
          return res.status(400).json({
            erro: 'Informe o número de patrimônio para resolver a ocorrência.'
          });
        }

        const { data: ocorrenciaAtual, error: erroConsulta } =
          await req.supabase
            .from('ocorrencias')
            .select('id, equipamento_id')
            .eq('id', id)
            .maybeSingle();

        if (erroConsulta) {
          console.error(
            'Erro ao consultar ocorrência:',
            erroConsulta.message
          );

          return res.status(500).json({
            erro: 'Não foi possível verificar a ocorrência.'
          });
        }

        if (!ocorrenciaAtual) {
          return res.status(404).json({
            erro: 'Ocorrência não encontrada.'
          });
        }

        if (!ocorrenciaAtual.equipamento_id) {
          return res.status(400).json({
            erro: 'Não é possível resolver a ocorrência sem um equipamento associado.'
          });
        }

        const { data: equipamento, error: erroPatrimonio } =
          await req.supabase
            .from('equipamentos')
            .select('id, numero_patrimonio')
            .eq('id', ocorrenciaAtual.equipamento_id)
            .maybeSingle();

        if (erroPatrimonio) {
          console.error(
            'Erro ao consultar patrimônio:',
            erroPatrimonio.message
          );

          return res.status(500).json({
            erro: 'Não foi possível verificar o patrimônio do equipamento.'
          });
        }

        if (!equipamento || !equipamento.numero_patrimonio) {
          return res.status(400).json({
            erro: 'O equipamento não possui número de patrimônio cadastrado.'
          });
        }

        if (
          numero_patrimonio_resolucao.trim() !==
          equipamento.numero_patrimonio.trim()
        ) {
          return res.status(400).json({
            erro: 'O número de patrimônio informado não corresponde ao equipamento associado.'
          });
        }

        atualizacoes.numero_patrimonio_resolucao =
          numero_patrimonio_resolucao.trim();

        atualizacoes.resolved_at = new Date().toISOString();

      } else {
        atualizacoes.resolved_at = null;
        atualizacoes.numero_patrimonio_resolucao = null;
      }

      atualizacoes.status = status;
    }

    if (prioridade !== undefined) {
      if (!prioridades.includes(prioridade)) {
        return res.status(400).json({
          erro: 'Prioridade inválida.'
        });
      }

      atualizacoes.prioridade = prioridade;
    }

    if (Object.keys(atualizacoes).length === 0) {
      return res.status(400).json({
        erro: 'Informe status ou prioridade para atualizar.'
      });
    }

    const { data, error } = await req.supabase
      .from('ocorrencias')
      .update(atualizacoes)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error(
        'Erro ao atualizar ocorrência:',
        error?.message
      );

      return res.status(404).json({
        erro: 'Ocorrência não encontrada ou não foi possível atualizar.'
      });
    }

    return res.json({
      mensagem: 'Ocorrência atualizada com sucesso!',
      ocorrencia: data
    });

  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error.message);

    return res.status(500).json({
      erro: 'Erro interno ao atualizar ocorrência.'
    });
  }
}


// Rota específica para status
router.patch(
  '/:id/status',
  autorizarPerfil('TECNICO', 'ADMIN'),
  atualizarOcorrencia
);

// Mantém compatibilidade com a rota anterior
router.patch(
  '/:id',
  autorizarPerfil('TECNICO', 'ADMIN'),
  atualizarOcorrencia
);

module.exports = router;
