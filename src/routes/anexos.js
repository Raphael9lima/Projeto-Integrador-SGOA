
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const router = express.Router();
const autenticar = require('../middleware/autenticacao');

const BUCKET = 'anexos-ocorrencias';
const LIMITE_ARQUIVO = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

// Verifica a assinatura real do arquivo
function validarAssinaturaArquivo(buffer, tipo) {
  if (!Buffer.isBuffer(buffer)) {
    return false;
  }

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

// Configuração do recebimento dos arquivos
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

// Todas as rotas exigem autenticação
router.use(autenticar);

// POST /anexos/ocorrencia/:ocorrencia_id
// Envia um arquivo para uma ocorrência
router.post(
  '/ocorrencia/:ocorrencia_id',
  (req, res, next) => {
    upload.single('arquivo')(req, res, (erro) => {
      if (!erro) return next();

      console.error('Erro no recebimento do arquivo:', erro.message);

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
  },
  async (req, res) => {
    let caminhoArquivo = null;

    try {
      const { ocorrencia_id } = req.params;
      const arquivo = req.file;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(ocorrencia_id)) {
        return res.status(400).json({
          erro: 'ID da ocorrência inválido.'
        });
      }

      if (!arquivo) {
        return res.status(400).json({
          erro: 'Selecione um arquivo para enviar.'
        });
      }

      // Confere se o tipo informado é permitido
      const extensao = TIPOS_PERMITIDOS[arquivo.mimetype];

      if (!extensao) {
        return res.status(400).json({
          erro: 'Formato de arquivo não permitido.'
        });
      }

      // Confere se o conteúdo corresponde ao tipo informado
      if (!validarAssinaturaArquivo(arquivo.buffer, arquivo.mimetype)) {
        return res.status(400).json({
          erro: 'O conteúdo do arquivo não corresponde ao formato informado.'
        });
      }

      // Verifica se o usuário pode acessar a ocorrência
      const { data: ocorrencia, error: erroOcorrencia } =
        await req.supabase
          .from('ocorrencias')
          .select('id')
          .eq('id', ocorrencia_id)
          .maybeSingle();

      if (erroOcorrencia) {
        console.error('Erro ao verificar ocorrência:', erroOcorrencia.message);

        return res.status(500).json({
          erro: 'Não foi possível verificar a ocorrência.'
        });
      }

      if (!ocorrencia) {
        return res.status(404).json({
          erro: 'Ocorrência não encontrada ou sem permissão de acesso.'
        });
      }

      // Nome aleatório para evitar conflitos
      const nomeInterno = `${crypto.randomUUID()}${extensao}`;

      caminhoArquivo = `${ocorrencia_id}/${nomeInterno}`;

      // Envia o arquivo ao Supabase Storage
      const { error: erroUpload } = await req.supabase
        .storage
        .from(BUCKET)
        .upload(caminhoArquivo, arquivo.buffer, {
          contentType: arquivo.mimetype,
          upsert: false
        });

      if (erroUpload) {
        console.error('Erro no Storage:', erroUpload.message);

        return res.status(500).json({
          erro: 'Não foi possível armazenar o arquivo.'
        });
      }

      // Registra os dados do arquivo no banco
      const { data: anexo, error: erroBanco } = await req.supabase
        .from('anexos')
        .insert({
          ocorrencia_id,
          usuario_id: req.usuario.id,
          nome_arquivo: path.basename(arquivo.originalname),
          caminho_arquivo: caminhoArquivo,
          tipo_mime: arquivo.mimetype,
          tamanho_bytes: arquivo.size
        })
        .select()
        .single();

      if (erroBanco) {
        console.error('Erro ao registrar anexo:', erroBanco.message);

        // Tenta remover o arquivo se o registro falhar
        const { error: erroRemocao } = await req.supabase
          .storage
          .from(BUCKET)
          .remove([caminhoArquivo]);

        if (erroRemocao) {
          console.error(
            'ATENÇÃO: falha ao remover arquivo órfão:',
            erroRemocao.message
          );
        }

        caminhoArquivo = null;

        return res.status(500).json({
          erro: 'Arquivo enviado, mas não foi possível registrar seus dados.'
        });
      }

      // Upload concluído
      caminhoArquivo = null;

      return res.status(201).json({
        mensagem: 'Anexo enviado com sucesso!',
        anexo
      });

    } catch (erro) {
      console.error('Erro inesperado ao enviar anexo:', erro.message);

      // Limpeza em caso de falha inesperada
      if (caminhoArquivo) {
        const { error } = await req.supabase
          .storage
          .from(BUCKET)
          .remove([caminhoArquivo]);

        if (error) {
          console.error('Falha na limpeza do arquivo:', error.message);
        }
      }

      return res.status(500).json({
        erro: 'Erro interno ao enviar anexo.'
      });
    }
  }
);

// GET /anexos/ocorrencia/:ocorrencia_id
// Consulta os anexos de uma ocorrência
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

    // Consulta os registros dos anexos
    const { data: anexos, error } = await req.supabase
      .from('anexos')
      .select(
        'id, ocorrencia_id, usuario_id, nome_arquivo, caminho_arquivo, tipo_mime, tamanho_bytes, created_at'
      )
      .eq('ocorrencia_id', ocorrencia_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao consultar anexos:', error.message);

      return res.status(500).json({
        erro: 'Não foi possível consultar os anexos.'
      });
    }

    // Gera links temporários para os arquivos privados
    const anexosComLinks = await Promise.all(
      anexos.map(async (anexo) => {
        const { data, error: erroLink } = await req.supabase
          .storage
          .from(BUCKET)
          .createSignedUrl(anexo.caminho_arquivo, 60);

        if (erroLink) {
          console.error(
            'Erro ao gerar link do anexo:',
            erroLink.message
          );

          throw new Error('Não foi possível gerar o acesso aos anexos.');
        }

        return {
          ...anexo,
          url_temporaria: data.signedUrl
        };
      })
    );

    return res.json({
      total: anexosComLinks.length,
      anexos: anexosComLinks
    });

  } catch (erro) {
    console.error('Erro ao consultar anexos:', erro.message);

    return res.status(500).json({
      erro: erro.message || 'Erro interno ao consultar anexos.'
    });
  }
});

module.exports = router;
