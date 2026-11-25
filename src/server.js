require('dotenv').config();

const express = require('express');
const supabase = require('./config/supabase');
const comentariosRoutes = require('./routes/comentarios');
const authRoutes = require('./routes/auth');
const equipamentosRoutes = require('./routes/equipamentos');
const ocorrenciasRoutes = require('./routes/ocorrencias');
const anexosRoutes = require('./routes/anexos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rotas da aplicação
app.use('/auth', authRoutes);
app.use('/equipamentos', equipamentosRoutes);
app.use('/ocorrencias', ocorrenciasRoutes);
app.use('/comentarios', comentariosRoutes);
app.use('/anexos', anexosRoutes);

// Rota inicial
app.get('/', (req, res) => {
  res.json({
    mensagem: 'Sistema de Gestão de Ocorrências e Ativos Escolares',
    status: 'Servidor funcionando!'
  });
});

// Teste de conexão com Supabase
app.get('/teste-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erro ao consultar Supabase:', error.message);

      return res.status(500).json({
        conectado: false,
        erro: error.message
      });
    }

    return res.json({
      conectado: true,
      mensagem: 'Consulta ao Supabase realizada com sucesso!',
      registrosEncontrados: data.length
    });

  } catch (error) {
    console.error('Falha inesperada no Supabase:', error.message);

    return res.status(500).json({
      conectado: false,
      erro: 'Falha ao consultar o Supabase.'
    });
  }
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});