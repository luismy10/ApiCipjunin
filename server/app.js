const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const DataBase = require('./database');
const moment = require('moment');
const buffer = require('buffer/').Buffer;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('port', process.env.PORT || 8080);

let database = new DataBase();

app.post("/api/login", (request, response) => {
    isValidateLogin(request.body.usuario, request.body.clave, response);
});

app.post("/api/informacion/", (request, response) => {
    getPersonaInformacion(request.body.idDni, response);
});

app.post("/api/perfil/", (request, response) => {
    getPersonaPerfil(request.body.idDni, response);
});

app.post("/api/ingresos/", (request, response) => {
    getIngresosById(request.body.idDni, response);
});

async function isValidateLogin(usuario, clave, response) {
    try {
        let connect = await database.connect()
        let persona = await connect.request()
            .input('usuario', database.getConnect().VarChar, usuario)
            .input('clave', database.getConnect().VarChar, clave)
            .query(`SELECT  
            p.idDNI,
            p.Nombres,
            p.Apellidos,
            p.CIP
            FROM Persona AS p
            WHERE p.CIP = @usuario AND p.CIP = @clave OR p.idDNI = @usuario AND p.idDNI = @clave`);
        if (persona.recordset.length != 0) {
            response.status(200).json({ "state": 1, "persona": persona.recordset[0], });
            database.disconnect();
            console.log("Conection login success")
        } else {
            response.status(200).json({ "state": 2, "message": "El usuario o contraseña son incorrectas." });
            database.disconnect();
            console.log("Conection login warning")
        }
    } catch (err) {
        console.log("Error de conexión en el login")
        console.log(err)
        response.status(500).json({ "state": 0, "message": "Error de conexión del servidor, intente nuevamente en un par de minutos." });
    }
}

async function getPersonaInformacion(idDni, response) {
    try {
        let montodeuda = 0;

        let connect = await database.connect()
        let persona = await connect.request()
            .input('idDNI', database.getConnect().VarChar, idDni)
            .query(`SELECT 
            p.idDNI,
            p.Nombres,
            p.Apellidos,
            p.CIP ,
            e.Especialidad,
            ca.Capitulo,
            CASE p.Condicion WHEN 'V' THEN 'VITALICIO' WHEN 'R' THEN 'RETIRADO' WHEN 'F' THEN 'FALLECIDO' WHEN 'T' THEN 'TRANSEUNTE' ELSE 'ORDINARIO' END AS Condicion,
            CONVERT(VARCHAR,CAST(ISNULL(uc.FechaUltimaCuota,C.FechaColegiado) AS DATE),103) AS FechaUltimaCuota,
            CONVERT(VARCHAR,CAST(DATEADD(MONTH,CASE p.Condicion WHEN 'O' THEN 3 WHEN 'V' THEN 9 ELSE 0 END,ISNULL(uc.FechaUltimaCuota,C.FechaColegiado)) AS DATE),103) AS HabilitadoHasta,
            CASE
            WHEN CAST (DATEDIFF(M,DATEADD(MONTH,CASE p.Condicion WHEN 'O' THEN 3 WHEN 'V' THEN 9 ELSE 0 END,ISNULL(uc.FechaUltimaCuota, C.FechaColegiado)) , GETDATE()) AS INT) <=0 THEN 1
            ELSE 0 END AS Habilidad,
            DATEDIFF(YEAR,GETDATE(),DATEADD(MONTH,c.MesAumento,DATEADD(YEAR,30,c.FechaColegiado))) CumplirTreinta
            FROM Persona AS p
            INNER JOIN Colegiatura AS c ON c.idDNI = p.idDNI AND c.Principal = 1
            INNER JOIN Especialidad AS e ON e.idEspecialidad = c.idEspecialidad
            INNER JOIN Capitulo as ca ON ca.idCapitulo = e.idCapitulo
            LEFT OUTER JOIN ULTIMACuota AS uc ON uc.idDNI = p.idDNI
            WHERE p.idDNI = @idDNI`);


        if (persona.recordset.length != 0) {

            let cuota = await connect.request()
                .input('idDni', database.getConnect().VarChar, persona.recordset[0].idDNI)
                .query(`SELECT 
                convert(varchar,cast(ISNULL(ul.FechaUltimaCuota, c.FechaColegiado)as date), 23) as UltimoPago     
                from Persona as p inner join Colegiatura as c
                on p.idDNI = c.idDNI and c.Principal = 1
                left outer join ULTIMACuota as ul
                on p.idDNI = ul.idDNI
                WHERE p.idDNI = @idDni`);

            let conceptos = await connect.request()
                .input('Categoria', database.getConnect().VarChar, persona.recordset[0].Condicion == "ORDINARIO" ? 1 : persona.recordset[0].Condicion == "VITALICIO" ? 3 : 0)
                .query(`SELECT co.idConcepto,co.Concepto,co.Categoria,co.Precio       
            from Concepto as co
            WHERE  Categoria = @Categoria and Estado = 1`);

            var date = moment(cuota.recordset[0].UltimoPago);
            var fechaactual = moment();

            if (fechaactual < date) {
                fechaactual = moment(cuota.recordset[0].UltimoPago);
                fechaactual.date(1);
            } else {
                fechaactual.date(1);
            }

            let altaColegiado = await connect.request()
                .input('idDni', database.getConnect().VarChar, persona.recordset[0].idDNI)
                .query(`SELECT * FROM Persona AS  p
            INNER JOIN Ingreso AS i ON i.idDNI = p.idDNI
            INNER JOIN Cuota as c on c.idIngreso = i.idIngreso
            WHERE i.idDNI = @idDni`);

            if (altaColegiado.recordset.length !== 0) {
                if (fechaactual >= date) {
                    date.month(date.month() + 1);
                    let inicio = date;
                    if (inicio <= fechaactual) {
                        while (inicio <= fechaactual) {
                            for (let value of conceptos.recordset) {
                                montodeuda += parseFloat(value.Precio)
                            }
                            inicio.month(inicio.month() + 1)
                        }
                    }
                }
            } else {
                if (fechaactual >= date) {
                    inicio = date;
                    if (inicio <= fechaactual) {
                        while (inicio <= fechaactual) {
                            for (let value of conceptos.recordset) {
                                montodeuda += parseFloat(value.Precio)
                            }
                            inicio.month(inicio.month() + 1);
                        }
                    }
                }
            }

            response.status(200).json({ "state": 1, "persona": persona.recordset[0], "deuda": montodeuda });
            database.disconnect();
            console.log("Conection getInformacion success")
        } else {
            response.status(200).json({ "state": 2, "message": "No tiene asociada ninguna colegiatura, es un nuevo agremiado o falta actualizar sus datos." });
            database.disconnect();
            console.log("Conection getInformacion warning")
        }
    } catch (error) {
        console.log("Conection getInformacion error")
        console.log(error.message)
        response.status(500).json({ "state": 0, "message": "Error de conexión del servidor, intente nuevamente en un par de minutos." });
    }
}

async function getPersonaPerfil(idDni, response) {
    try {
        let connect = await database.connect()
        let persona = await connect.request()
            .input('idDNI', database.getConnect().VarChar, idDni)
            .query(`SELECT 
            p.idDNI,
            p.Nombres,
            p.Apellidos,
            p.CIP,
            p.Sexo,
            CONVERT(VARCHAR,CAST(ISNULL(p.FechaNac,GETDATE()) AS DATE),103) AS FechaNac,
            CASE p.Condicion WHEN 'V' THEN 'VITALICIO' WHEN 'R' THEN 'RETIRADO' WHEN 'F' THEN 'FALLECIDO' WHEN 'T' THEN 'TRANSEUNTE' ELSE 'ORDINARIO' END AS Condicion
            FROM Persona AS p
            WHERE p.idDNI = @idDNI`);

        let image = await connect.request()
            .input('idDNI', database.getConnect().VarChar, idDni)
            .query(`SELECT TOP 1 
            idDNI,Foto
            FROM PersonaImagen WHERE idDNI = @idDNI`);

        let icon = "";
        if (image.recordset.length != 0) {
            icon = buffer.from(image.recordset[0].Foto).toString('base64');
        }

        response.status(200).json({ "state": 1, "persona": persona.recordset[0], image: icon });
        database.disconnect();
        console.log("Conection getPersonaPerfil success")
    } catch (error) {
        console.log("Conection getPersonaPerfil error")
        console.log(error.message)
        response.status(500).json({ "state": 0, "message": "Error de conexión del servidor, intente nuevamente en un par de minutos." });
    }
}

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
        response.status(200).json({ "state": 1, "data": object.recordset });
        database.disconnect();
        console.log("Conection getIngresosById success")
    } catch (error) {
        console.log("Error en obtener getIngresosById")
        response.status(500).json({ "state": 0, "message": "Error de conexión del servidor, intente nuevamente en un par de minutos." });
    }
}

app.get('*', function (req, res) {
    res.send('Págino no encontrada error 404', 404);
});

//The 404 Route (ALWAYS Keep this as the last route)
app.listen(app.get('port'), () => { console.log("app is running in http://localhost:" + app.get('port')) });