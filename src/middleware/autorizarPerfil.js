
function autorizarPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          erro: 'Usuário não autenticado.'
        });
      }

      if (!perfisPermitidos.includes(req.usuario.perfil)) {
        return res.status(403).json({
          erro: 'Você não possui permissão para realizar esta operação.'
        });
      }

      next();

    } catch (error) {
      console.error('Erro ao verificar permissões:', error.message);

      return res.status(500).json({
        erro: 'Erro interno ao verificar permissões.'
      });
    }
  };
}

module.exports = autorizarPerfil;
