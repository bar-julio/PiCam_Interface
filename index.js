const express = require("express");
const config = require("config");
const app = express();
const port = config.get("server.port");
const host = config.get("server.host");
const validip = require("./validip.json");
const bodyParser = require("body-parser");
const fs = require("fs");
const { exec } = require("child_process");
app.use(bodyParser.json());

// app.all("*", (req, res) => {
//     res.status(404);
//     res.send("404!");
// });

//hey
const checkIfValid = (headers) => {
    let requester = headers["x-real-ip"];
    let result = 0;
    if (requester) {
        for (const iterator of validip) {
            if (iterator == requester) {
                result = iterator;
                break;
            }
        }
    }
    return result;
};

const checkFileExistsSync = (filepath) => {
    let flag = true;
    try {
        fs.accessSync(filepath, fs.constants.F_OK);
    } catch (e) {
        flag = false;
    }
    return flag;
};

const picHandler = (req, res) => {
    const isValid = checkIfValid(req.headers);
    if (isValid) {
        //valid
        let agregated = "";
        let batch = false;
        if (req.body) {
            batch = req.body.batch;
            if (req.body.args) {
                agregated = req.body.args;
            }
        }
        const fecha = new Date();
        let mes = fecha.getMonth();
        mes += 1;
        if (String(mes).length == 1) {
            mes = "0" + mes;
        }
        let dia = fecha.getDate();
        if (String(dia).length == 1) {
            dia = "0" + dia;
        }
        let hour = fecha.getHours();
        if (String(hour).length == 1) {
            hour = "0" + hour;
        }
        let minuto = fecha.getMinutes();
        if (String(minuto).length == 1) {
            minuto = "0" + minuto;
        }
        let seconds = fecha.getSeconds();
        if (String(seconds).length == 1) {
            seconds = "0" + seconds;
        }
        const baseCommand = "raspistill";
        const filename = `${fecha.getFullYear()}${mes}${dia}-${hour}.${minuto}.${seconds}.${fecha.getMilliseconds()}-PICAMPIC.jpeg`;
        const fullFileName = `/tmp/${filename}`;
        let command = `${baseCommand} -o "${fullFileName}" ${agregated}`;

        //log
        console.log("Op---");
        console.log("baseCommand: " + baseCommand);
        console.log("filename: " + filename);
        console.log("agregated: " + agregated);
        console.log("batch: " + batch);
        console.log("Exec: " + command);
        console.log("---;");
        //--
        let script = exec(command, undefined);
        if (batch) {
            res.send(filename);
        } else {
            script.on("error", (err) => {
                console.log(`Error on script: ${err.message}`);
                res.send(`Error: ${err.message}`);
            });
            script.on("exit", (code) => {
                if (code == 0 && !batch) {
                    res.download(fullFileName, (err) => {
                        if (!err) {
                            console.log("deleting: ", fullFileName);
                            command = `rm -rf ${fullFileName}`;
                            exec(command, undefined);
                        } else {
                            console.error("err: ", err);
                        }
                    });
                }
            });
        }
    } else {
        res.send("invalid");
    }
};

app.get("/", (req, res) => {
    res.status(200).send("Menu");
});
app.get("/pic", picHandler);
app.post("/pic", picHandler);
app.get("/getpic", (req, res) => {
    const isValid = checkIfValid(req.headers);
    if (isValid) {
        if (req.body) {
            if (req.body.filename) {
                const filename = req.body.filename;
                const fullFileName = `/tmp/${filename}`;
                if (checkFileExistsSync(fullFileName)) {
                    res.download(fullFileName, (err) => {
                        if (!err) {
                            let command = `rm -rf ${fullFileName}`;
                            exec(command, undefined);
                        }
                    });
                } else {
                    res.send("Not ready");
                }
            } else {
                res.send("Filename not set");
            }
        } else {
            res.send("Body not set");
        }
    } else {
        res.send("invalid");
    }
});
app.get("/testjpeg", (req, res) => {
    const file = __dirname + "/test.jpeg";
    res.download(file);
});
app.get("/ping", (req, res) => {
    res.send("PiCam up!", 200);
});
app.get("/whatsmyip", (req, res) => {
    res.send("Your IP is: " + req.headers["x-real-ip"], 200);
});
const server = app.listen(port, host, (err) => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.log(`Server is on ${host}:${server.address().port}`);
});
