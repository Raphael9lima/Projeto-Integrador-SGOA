
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configure as variáveis do Supabase no .env');
}

async function autenticar(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Token não informado.'
      });
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        erro: 'Token inválido.'
      });
    }

    const supabaseUsuario = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { data: authData, error: authError } =
      await supabaseUsuario.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({
        erro: 'Sessão inválida ou expirada.'
      });
    }

    const { data: perfil, error: perfilError } =
      await supabaseUsuario
        .from('usuarios')
        .select('id, nome, email, cgm_ra, perfil')
        .eq('id', authData.user.id)
        .single();

    if (perfilError || !perfil) {
      return res.status(403).json({
        erro: 'Perfil não encontrado.'
      });
    }

    req.usuario = {
      id: authData.user.id,
      email: authData.user.email,
      perfil: perfil.perfil,
      dados: perfil
    };

    req.supabase = supabaseUsuario;

    next();

  } catch (error) {
    console.error('Erro na autenticação:', error.message);

    return res.status(500).json({
      erro: 'Erro interno de autenticação.'
    });
  }
}

module.exports = autenticar;
