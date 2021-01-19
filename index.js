const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors'); 

const app = express();
app.use(cors()); //PERMITE CHAMADA DE ORIGEM DIFERENTES
app.use(express.json()); //PERMITE API RECEBA JSON


// LEVATAR SEVIDOR NA PORTA 3000
app.listen(3000, () => {
    console.log("Server started (http://localhost:3000/) !");
});


// CRIAR TABELA NO BANCO DE DADOS
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error("Erro opening database " + err.message);
    } else {

        db.run('CREATE TABLE pessoas( \
            pessoa_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
            nome NVARCHAR(50)  NOT NULL,\
            email NVARCHAR(50)  NOT NULL \
        )', (err) => {
            if (err) {
                console.log("tabela já exite.");
            }

        });
        db.run('CREATE TABLE pagamentos( \
            idPagamento INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\
                valor DOUBLE NOT NULL,\
                data DATETIME DEFAULT CURRENT_TIMESTAMP,\
                idPagador int,\
                idRecebedor int,\
                FOREIGN KEY (idRecebedor) REFERENCES pessoas(pessoa_id),\
                FOREIGN KEY (idPagador) REFERENCES pessoas(pessoa_id)\
        )', (err) => {
            if (err) {
                console.log("tabela pagamentos já exite.");
            }
        });
    }
});

// ENDPOINT PARA CARREGAR TODAS AS PESSOAS 
app.get('/pessoas', (req, res) => {
    db.all('SELECT * FROM pessoas', [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        res.status(200).json(rows);

    });
});

// ENDPOINT PARA CARREGAR PESSOAS EXPECIFICA POR ID
app.get("/pessoas/:id", (req, res) => {
    var params = [req.params.id]
    db.get(`SELECT * FROM pessoas where pessoa_id = ?`, [params], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.status(200).json(row);
    });
});

// ENDPOINT PARA CADASTRAR PESSOA
app.post("/pessoas", (req, res) => {

    const { nome, email } = req.body;

    db.run(`INSERT INTO pessoas (nome, email) VALUES (?,?)`,
        [nome, email],
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": err.message })
                return;
            }
            res.status(201).json({
                "pessoa_id": this.lastID
            })
        });
});


// ENDPOINT PARA ATUALIZAR DETERMINADA PESSOAS 
app.patch("/pessoas/:id", (req, res) => {
    const { nome, email } = req.body;
    const { id } = req.params;

    db.run(`UPDATE pessoas set nome = ?, email = ? WHERE pessoa_id = ?`,
        [nome, email, id],
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": res.message })
                return;
            }
            res.status(200).json({ updatedID: this.changes });
        });
});

// ENDPOINT PARA DELETAR DETERMINADA PESSOAS 
app.delete("/pessoas/:id", (req, res) => {
    db.run(`DELETE FROM pessoas WHERE pessoa_id = ?`,
        req.params.id,
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": res.message })
                return;
            }
            res.status(200).json({ deletedID: this.changes })
        });
});

// ENDPOINT PARA CADASTRAR PAGAMENTOS
app.post("/pagamentos", (req, res) => {

    const { valor, idPagador, idRecebedor } = req.body;

    db.run(`INSERT INTO pagamentos (valor, idPagador, idRecebedor) VALUES (?,?,?)`,
        [valor, idPagador, idRecebedor],
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": err.message })
                return;
            }
            res.status(201).json({
                "idPagamento": this.lastID
            })
        });
});

// ENDPOINT PARA CARREGAR TODAS TRANSFERENCIAS
app.get('/pagamentos', (req, res) => {
    db.all(`SELECT distinct pagamentos.valor, pagamentos.data, PAGADOR.nome as nomePagador, RECEBEDOR.nome as nomeRecebedor
    FROM pessoas PAGADOR, pessoas RECEBEDOR
    inner JOIN pagamentos ON PAGADOR.pessoa_id = pagamentos.idPagador
    inner JOIN pessoas ON RECEBEDOR.pessoa_id = pagamentos.idRecebedor`, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        res.status(200).json(rows);

    });
});

// ENDPOINT PARA CARREGAR AS TRANSFERENCIA POR RECEBEDOR
app.get('/pagamentos/recebedor/:idRecebedor', (req, res) => {
    var params = [req.params.idRecebedor]
    db.all(`SELECT distinct pagamentos.valor, pagamentos.data, PAGADOR.nome as nomePagador, RECEBEDOR.nome as nomeRecebedor
    FROM pessoas PAGADOR, pessoas RECEBEDOR
    inner JOIN pagamentos ON PAGADOR.pessoa_id = pagamentos.idPagador
    inner JOIN pessoas ON RECEBEDOR.pessoa_id = pagamentos.idRecebedor WHERE pagamentos.idRecebedor = ?`, [params], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        res.status(200).json(rows);

    });
});

// ENDPOINT PARA CARREGAR AS TRANSFERENCIA POR PAGADOR
app.get('/pagamentos/pagador/:idPagador', (req, res) => {
    var params = [req.params.idPagador]
    db.all(`SELECT distinct pagamentos.valor, pagamentos.data, PAGADOR.nome as nomePagador, RECEBEDOR.nome as nomeRecebedor
    FROM pessoas PAGADOR, pessoas RECEBEDOR
    inner JOIN pagamentos ON PAGADOR.pessoa_id = pagamentos.idPagador
    inner JOIN pessoas ON RECEBEDOR.pessoa_id = pagamentos.idRecebedor WHERE pagamentos.idPagador = ?`, [params], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        res.status(200).json(rows);

    });
});

// ENDPOINT EXTRATOR DE TRANSFERENCIA DE UMA DETERMINADA PESSOA
app.get('/pagamentos/detalhar/:idPessoa', (req, res) => {
    const { idPessoa } = req.params;
    let pessoa = {};
    db.get(`SELECT * FROM pessoas where pessoa_id = ?`, [idPessoa], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        pessoa = { ...row };

        db.all(`SELECT distinct pagamentos.valor, pagamentos.data, PAGADOR.nome as nomePagador, RECEBEDOR.nome as nomeRecebedor
        FROM pessoas PAGADOR, pessoas RECEBEDOR
        inner JOIN pagamentos ON PAGADOR.pessoa_id = pagamentos.idPagador
        inner JOIN pessoas ON RECEBEDOR.pessoa_id = pagamentos.idRecebedor WHERE pagamentos.idPagador = ?`, [idPessoa], (err, rows) => {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            pessoa.pagador = rows;

            db.all(`SELECT distinct pagamentos.valor, pagamentos.data, PAGADOR.nome as nomePagador, RECEBEDOR.nome as nomeRecebedor
    FROM pessoas PAGADOR, pessoas RECEBEDOR
    inner JOIN pagamentos ON PAGADOR.pessoa_id = pagamentos.idPagador
    inner JOIN pessoas ON RECEBEDOR.pessoa_id = pagamentos.idRecebedor WHERE pagamentos.idRecebedor = ?`, [idPessoa], (err, rows) => {
                if (err) {
                    res.status(400).json({ "error": err.message });
                    return;
                }


                pessoa.recebedor = rows;
                res.status(200).json(pessoa);
            });

        });
    });


});