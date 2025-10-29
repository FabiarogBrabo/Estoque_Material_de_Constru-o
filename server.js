const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// Configuração da Conexão com o BD MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root', // Usuário padrão do XAMPP
    password: '',   // Senha padrão do XAMPP
    database: 'saep_db', // [cite: 16]
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // Usar promises para async/await

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configurar o EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir arquivos estáticos (CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da Sessão
app.use(session({
    secret: 'seu-segredo-aqui', // Troque por uma string aleatória
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Em produção, use 'true' com HTTPS
}));

// Middleware de autenticação
const checkAuth = (req, res, next) => {
    if (req.session.usuario) {
        next(); // Usuário está logado, continue
    } else {
        res.redirect('/'); // Redireciona para login
    }
};

// Rotas
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');

// Passar o pool de conexão (db) e o middleware (checkAuth) para as rotas
app.use('/', authRoutes(db));
app.use('/app', checkAuth, appRoutes(db));

// Rota raiz redireciona para o login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});