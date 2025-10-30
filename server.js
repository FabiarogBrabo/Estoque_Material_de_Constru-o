const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// --- MUDANÇA DO PLANO B ---
// Vamos usar createConnection em vez de createPool para forçar uma nova ligação.
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'saep_db'
}).promise();
// --- FIM DA MUDANÇA ---

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
    secret: 'seu-segredo-aqui',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware de autenticação
const checkAuth = (req, res, next) => {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/');
    }
};

// Rotas
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');

app.use('/', authRoutes(db));
app.use('/app', checkAuth, appRoutes(db));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

