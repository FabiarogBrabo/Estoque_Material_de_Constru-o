const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Rota para exibir a página de login
    router.get('/login', (req, res) => {
        res.render('login', { error: null });
    });

    // Rota para processar o login 
    router.post('/login', async (req, res) => {
        const { login, senha } = req.body;

        try {
            const [rows] = await db.query(
                'SELECT * FROM usuarios WHERE login = ? AND senha = ?', 
                [login, senha]
            );

            if (rows.length > 0) {
                // Usuário encontrado
                req.session.usuario = rows[0]; // Armazena dados do usuário na sessão
                res.redirect('/app/principal');
            } else {
                // Falha na autenticação 
                res.render('login', { error: 'Login ou senha incorretos.' });
            }
        } catch (err) {
            console.error(err);
            res.render('login', { error: 'Erro no servidor. Tente novamente.' });
        }
    });

    // Rota de Logout 
    router.get('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return console.error(err);
            }
            res.redirect('/login'); // Redireciona para a tela de login
        });
    });

    return router;
};