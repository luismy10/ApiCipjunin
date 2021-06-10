const express = require('express');
const app = express();
const cors = require('cors');
const DataBase = require('./database');
const { response } = require('express');
// const mysql = require('mysql');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('port', process.env.PORT || 8080);

let database = new DataBase();

app.post("/api/products/addproduct", (request, response) => {
    console.log(request.body);

});

app.get("/api/ingresos/:id", (request, response) => {
    getIngresosById(request.params.id, response);
});

app.get('/api/ingresos/', (request, response) => {
    getAllIngresos(response)
})

async function getIngresosById(idDni, response) {
    try {
        let connect = await database.connect();
        let object = await connect.request()
            .input('idDNI', database.getConnect().VarChar, idDni)
            .query(`SELECT 
                i.idIngreso,
                convert(VARCHAR, CAST(i.Fecha AS DATE),103) AS Fecha,
                i.Hora,
                tc.Nombre as Comprobante,
                i.Serie, 
                i.NumRecibo,
                i.Estado,
                p.CIP,
                case when not e.IdEmpresa is null then 'RUC' else 'DNI' end as NombreDocumento,
                isnull(e.NumeroRuc,p.idDNI) as NumeroDocumento,
                isnull(e.Nombre,concat(p.Apellidos,' ', p.Nombres)) as Persona,
                sum(d.Monto) AS Total
                FROM Ingreso AS i 
                INNER JOIN TipoComprobante AS tc ON tc.IdTipoComprobante = i.TipoComprobante
                INNER JOIN Persona AS p ON i.idDNI = p.idDNI
                LEFT JOIN EmpresaPersona AS e ON e.IdEmpresa = i.idEmpresaPersona
                INNER JOIN Detalle AS d ON d.idIngreso = i.idIngreso
                WHERE
                p.idDNI = @idDNI
                GROUP BY i.idIngreso,i.Fecha,i.Hora,i.Serie,i.NumRecibo,i.Estado,
                p.CIP,p.idDNI,p.Apellidos,p.Nombres,e.NumeroRuc,e.Nombre,e.IdEmpresa,tc.Nombre
                ORDER BY i.Fecha DESC,i.Hora DESC`);
        console.log(object.rowsAffected[0]);
        response.status(200).json({ "state": 1, "result": object.recordset });
        database.disconnect();
    } catch (error) {
        console.log("Error de conexión")
        response.status(500).json({ "state": 2, "result": error });
        database.disconnect();
    }
}

async function getAllIngresos(response) {
    try {
        let connect = await database.connect()
        let object = await connect.request().query('select top 2 * from Ingreso');
        console.log(object)
        response.send(object, 200)
    } catch (err) {
        console.log("Error de conexión")
        console.log(err)
        response.send(err)
    }
}

async function insertProducto() {
    try {
        let connect = await database.connect();
        let value = await connect.request();
        console.log();
    } catch (error) {

    }
}

//create database connection
// const conn = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'web_app',
//     port: '3306'
// });

//connect to database
// conn.connect((err) => {
//     if (err) {
//         console.log(err);
//         return;
//     }
//     console.log('Mysql Connected...');
// });

// app.get('/', (request, response) => {
//     response.send('<h1>HOLA</h1><h2>HOLA</h2><h3>HOLA</h3>');
// });

//show all products
// app.get('/api/products', (req, res) => {
//     let sql = "SELECT * FROM product";
//     let query = conn.query(sql, (err, results) => {
//         if (err) {
//             res.send(JSON.stringify({ "status": 500, "message": err }));
//         } else {
//             res.send(JSON.stringify({ "status": 200, "response": results }));
//             console.log(query)
//         }
//     });
// });

//show single product
// app.get('/api/products/:id', (req, res) => {
//     let sql = "SELECT * FROM product WHERE product_id=" + req.params.id;
//     let query = conn.query(sql, (err, results) => {
//         if (err) {
//             res.send(JSON.stringify({ "status": 500, "message": err }));
//         } else {
//             res.send(JSON.stringify({ "status": 200, "response": results }));
//             console.log(query)
//         }
//     });
// });

//add new product
// app.post('/api/addproduct', (req, res) => {
//     let body = req.body;
//     let data = { product_name: body.product_name, product_price: body.product_price };
//     let sql = "INSERT INTO product SET ?";
//     let query = conn.query(sql, data, (err, results) => {
//         if (err) {
//             res.send(JSON.stringify({ "status": 500, "message": err }));
//         } else {
//             res.send(JSON.stringify({ "status": 200, "response": results }));
//         }
//     });
// });

app.get('*', function(req, res) {
    res.send('Págino no encontrada error 404', 404);
});

//The 404 Route (ALWAYS Keep this as the last route)

app.listen(app.get('port'), () => { console.log("app is running in http://localhost:" + app.get('port')) });