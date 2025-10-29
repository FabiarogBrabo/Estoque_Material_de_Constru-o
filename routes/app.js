const express = require('express');
const router = express.Router();

module.exports = (db) => {
    
    // --- ROTA PRINCIPAL --- 
    router.get('/principal', (req, res) => {
        res.render('principal', { usuario: req.session.usuario }); //  (Exibir nome)
    });

    // --- ROTAS DE PRODUTOS (ITEM 6) --- 

    // GET: Exibe a página de cadastro e lista de produtos [cite: 30, 31]
    router.get('/produtos', async (req, res) => {
        try {
            const [produtos] = await db.query('SELECT * FROM produtos');
            res.render('produtos', { 
                usuario: req.session.usuario, 
                produtos: produtos,
                error: null,
                success: null
            });
        } catch (err) {
            res.render('produtos', { 
                usuario: req.session.usuario, 
                produtos: [],
                error: 'Erro ao carregar produtos.',
                success: null
            });
        }
    });

    // POST: Adicionar novo produto [cite: 33]
    router.post('/produtos/add', async (req, res) => {
        // Validação simples 
        const { nome, estoque_minimo, estoque_atual, unidade_medida, data_validade } = req.body;
        if (!nome || !estoque_minimo || !estoque_atual || !unidade_medida) {
            const [produtos] = await db.query('SELECT * FROM produtos');
            return res.render('produtos', {
                usuario: req.session.usuario,
                produtos: produtos,
                error: 'Todos os campos obrigatórios (exceto validade) devem ser preenchidos.', 
                success: null
            });
        }

        try {
            const { nome, descricao, estoque_minimo, estoque_atual, unidade_medida, data_validade } = req.body;
            await db.query(
                'INSERT INTO produtos (nome, descricao, estoque_minimo, estoque_atual, unidade_medida, data_validade) VALUES (?, ?, ?, ?, ?, ?)',
                [nome, descricao || null, estoque_minimo, estoque_atual, unidade_medida, data_validade || null]
            );
            res.redirect('/app/produtos'); // Recarrega a página
        } catch (err) {
            console.error(err);
            const [produtos] = await db.query('SELECT * FROM produtos');
            res.render('produtos', {
                usuario: req.session.usuario,
                produtos: produtos,
                error: 'Erro ao cadastrar produto.',
                success: null
            });
        }
    });

    // API: Obter dados de um produto (para edição)
    router.get('/api/produtos/:id', async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
            if (rows.length > 0) {
                res.json(rows[0]);
            } else {
                res.status(404).json({ error: 'Produto não encontrado.' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Erro no servidor.' });
        }
    });

    // POST: Editar produto 
    router.post('/produtos/edit', async (req, res) => {
        const { id, nome, descricao, estoque_minimo, estoque_atual, unidade_medida, data_validade } = req.body;
        
        // Validação 
        if (!id || !nome || !estoque_minimo || !estoque_atual || !unidade_medida) {
            return res.status(400).send('Dados inválidos para edição.');
        }

        try {
            await db.query(
                'UPDATE produtos SET nome = ?, descricao = ?, estoque_minimo = ?, estoque_atual = ?, unidade_medida = ?, data_validade = ? WHERE id = ?',
                [nome, descricao || null, estoque_minimo, estoque_atual, unidade_medida, data_validade || null, id]
            );
            res.redirect('/app/produtos');
        } catch (err) {
            console.error(err);
            res.status(500).send('Erro ao atualizar produto.');
        }
    });

    // DELETE: Excluir produto 
    router.delete('/api/produtos/:id', async (req, res) => {
        try {
            await db.query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Produto excluído.' });
        } catch (err) {
            console.error(err);
            // Verifica erro de chave estrangeira (se houver movimentações)
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ success: false, error: 'Não é possível excluir. Produto possui histórico de movimentação.' });
            }
            res.status(500).json({ success: false, error: 'Erro ao excluir produto.' });
        }
    });


    // --- ROTAS DE GESTÃO DE ESTOQUE (ITEM 7) --- 

    // GET: Exibe a página de gestão de estoque
    router.get('/estoque', async (req, res) => {
        try {
            // 1. Busca os produtos 
            let [produtos] = await db.query('SELECT id, nome, estoque_atual, estoque_minimo FROM produtos');
            
            // 2. Aplica algoritmo de ordenação (JavaScript sort) em ordem alfabética [cite: 42, 43]
            produtos.sort((a, b) => {
                return a.nome.localeCompare(b.nome);
            });

            res.render('estoque', { 
                usuario: req.session.usuario, 
                produtos: produtos,
                error: null,
                success: null
            });
        } catch (err) {
            console.error(err);
            res.render('estoque', { 
                usuario: req.session.usuario, 
                produtos: [],
                error: 'Erro ao carregar dados de estoque.',
                success: null
            });
        }
    });

    // POST: Registrar movimentação de estoque
    router.post('/estoque/movimentar', async (req, res) => {
        const { produto_id, tipo, quantidade, data_movimentacao } = req.body; 
        const usuario_id = req.session.usuario.id;  
        let alertMessage = null; // Mensagem de estoque baixo 

        // Validação básica
        if (!produto_id || !tipo || !quantidade || !data_movimentacao || quantidade <= 0) {
            return res.status(400).send('Dados da movimentação inválidos.');
        }

        const connection = await db.getConnection(); // Usar transação

        try {
            await connection.beginTransaction();

            // 1. Buscar produto e bloquear a linha para atualização (SELECT ... FOR UPDATE)
            const [rows] = await connection.query('SELECT * FROM produtos WHERE id = ? FOR UPDATE', [produto_id]);
            if (rows.length === 0) {
                throw new Error('Produto não encontrado.');
            }
            const produto = rows[0];
            let novoEstoque = produto.estoque_atual;

            // 2. Calcular novo estoque
            if (tipo === 'entrada') {
                novoEstoque += parseInt(quantidade);
            } else if (tipo === 'saida') {
                novoEstoque -= parseInt(quantidade);
                
                // 2.1 Verificação de estoque mínimo 
                if (novoEstoque < produto.estoque_minimo) {
                    alertMessage = `ALERTA: O produto "${produto.nome}" ficou abaixo do estoque mínimo (${produto.estoque_minimo})! Estoque atual: ${novoEstoque}.`;
                }
                if (novoEstoque < 0) {
                    throw new Error('Estoque insuficiente para esta saída.');
                }
            }

            // 3. Registrar a movimentação 
            await connection.query(
                'INSERT INTO movimentacoes (produto_id, usuario_id, tipo, quantidade, data_movimentacao) VALUES (?, ?, ?, ?, ?)',
                [produto_id, usuario_id, tipo, quantidade, data_movimentacao]
            );

            // 4. Atualizar o estoque atual do produto
            await connection.query(
                'UPDATE produtos SET estoque_atual = ? WHERE id = ?',
                [novoEstoque, produto_id]
            );

            // 5. Commit da transação
            await connection.commit();

            // Recarrega a página de estoque com mensagem de sucesso (e alerta se houver)
            let [produtos] = await db.query('SELECT id, nome, estoque_atual, estoque_minimo FROM produtos');
            produtos.sort((a, b) => a.nome.localeCompare(b.nome)); // [cite: 42, 43]

            res.render('estoque', { 
                usuario: req.session.usuario, 
                produtos: produtos,
                error: null,
                success: alertMessage || 'Movimentação registrada com sucesso!' // 
            });

        } catch (err) {
            await connection.rollback(); // Desfaz em caso de erro
            console.error(err);
            
            let [produtos] = await db.query('SELECT id, nome, estoque_atual, estoque_minimo FROM produtos');
            produtos.sort((a, b) => a.nome.localeCompare(b.nome));

            res.render('estoque', { 
                usuario: req.session.usuario, 
                produtos: produtos,
                error: err.message || 'Erro ao registrar movimentação.',
                success: null
            });
        } finally {
            connection.release();
        }
    });

    return router;
};